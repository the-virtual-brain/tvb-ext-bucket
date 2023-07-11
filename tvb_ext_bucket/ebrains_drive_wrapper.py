# -*- coding: utf-8 -*-
#
# "TheVirtualBrain - Widgets" package
#
# (c) 2022-2023, TVB Widgets Team
#
import ebrains_drive.exceptions
import requests

from ebrains_drive.files import DataproxyFile
from ebrains_drive.exceptions import Unauthorized

from tvb_ext_bucket.logger.builder import get_logger
from tvb_ext_bucket.exceptions import CollabTokenError, CollabAccessError, DataproxyFileNotFound
import os

from tvb_ext_bucket.bucket_api.bucket_api import BucketApiClient
from tvb_ext_bucket.bucket_api.bucket import Bucket
import pathlib

LOGGER = get_logger(__name__)

TOKEN_ENV_VAR = 'CLB_AUTH'


def get_collab_token():
    # type: () -> str
    """
    Try to get the collab authentication token of the current user
    -----
    :return: token
    """
    try:
        from clb_nb_utils import oauth as clb_oauth
        token = clb_oauth.get_token()
    except (ModuleNotFoundError, ConnectionError) as e:
        LOGGER.warning(f"Could not connect to EBRAINS to retrieve an auth token: {e}")
        LOGGER.info(f"Will try to use the auth token defined by environment variable {TOKEN_ENV_VAR}...")

        token = os.environ.get(TOKEN_ENV_VAR)
        if token is None:
            LOGGER.error(f"No auth token defined as environment variable {TOKEN_ENV_VAR}! Please define one!")
            raise CollabTokenError("Cannot connect to EBRAINS HPC without an auth token! Either run this on "
                                   f"Collab, or define the {TOKEN_ENV_VAR} environment variable!")

        LOGGER.info(f"Successfully retrieved the auth token from environment variable {TOKEN_ENV_VAR}!")

    return token


class BucketWrapper:
    def __init__(self):
        self.client = self.get_client()

    def _get_bucket(self, bucket_name):
        # type: (str) -> Bucket
        """
        Gets a Bucket instance for the specified name if current user has access to it
        :param bucket_name: name of the bucket as string
        :return: Bucket instance for the provided name
        """
        LOGGER.info(f'Getting bucket {bucket_name}')
        try:
            bucket = self.client.buckets.get_bucket(bucket_name)
            LOGGER.info('Bucket retrieved successfully.')
        except Unauthorized as e:
            error_msg = f'Could not access bucket {bucket_name} due to {str(e)}. Your access might be limited!'
            LOGGER.error(error_msg)
            raise CollabAccessError(error_msg)
        except ebrains_drive.exceptions.ClientHttpError as e:
            error_msg = f'Cant get client for bucket {bucket_name}. ' \
                        f'Bucket might not exist or your access is limited! {e.message}. '
            LOGGER.error(error_msg)
            raise CollabAccessError(error_msg)
        return bucket

    def _get_dataproxy_file(self, file_path, bucket_name):
        # type: (str, str) -> DataproxyFile
        """
        Get the DataProxy file corresponding to the path <file_path> in bucket <bucket_name>
        """
        file_path = file_path.lstrip('/')
        bucket = self._get_bucket(bucket_name)
        # find first dataproxy file corresponding to provided path
        dataproxy_file = next((f for f in bucket.ls() if f.name == file_path), None)
        return dataproxy_file

    def get_files_in_bucket(self, bucket_name):
        # type: (str) -> list[str]
        """
        Gets the list of files in a bucket space
        !!! According to the API you can't have empty dirs in a bucket
        :param bucket_name: name of the bucket as string
        :return:
        """
        bucket = self._get_bucket(bucket_name)
        # remove the prefix from the list of files
        files_list = [f.name for f in bucket.ls()]
        return files_list

    @staticmethod
    def get_client():
        # type: () -> BucketApiClient
        """
        Get an instance of the BucketApiClient
        Returns
        -------

        """
        try:
            token = get_collab_token()
        except Exception as e:
            LOGGER.warning(f"Could not connect to EBRAINS to retrieve an auth token: {e}")
            LOGGER.info(f'"Will try to use the auth token defined by environment variable {TOKEN_ENV_VAR}...')
            token = os.environ.get(TOKEN_ENV_VAR)
        if not token:
            LOGGER.error(f"No auth token defined as environment variable {TOKEN_ENV_VAR}! Please define one!")
            raise CollabTokenError(f"Cannot connect to EBRAINS HPC without an auth token! Either run this on "
                                   f"Collab, or define the {TOKEN_ENV_VAR} environment variable!")
        LOGGER.info('Token retrieved successfully!')
        return BucketApiClient(token=token)

    def download_file(self, file_path, bucket_name, location):
        # type: (str, str, str) -> bool
        """
        download a file with absolute path as <file_path> from bucket with name <bucket_name>
        to location <location>
        """
        LOGGER.info(f'DOWNLOADING: attempt to download {file_path} from bucket {bucket_name} to location {location}')
        dataproxy_file = self._get_dataproxy_file(file_path, bucket_name)
        LOGGER.info(f'FOUND: File found: {dataproxy_file}')
        if dataproxy_file is None:
            return False
        file_name = file_path.split('/')[-1]
        target_file = os.path.join(location, file_name)
        with open(target_file, 'xb') as f:
            content = dataproxy_file.get_content()
            f.write(content)
        return True

    def get_download_url(self, file_path, bucket_name):
        # type: (str, str) -> str
        """
        Get download URL for a dataproxy file at <file_path> in bucket <bucket_name>
        """
        LOGGER.info(f'Attempting to get download ulr for file {file_path} from bucket {bucket_name}')
        dataproxy_file = self._get_dataproxy_file(file_path, bucket_name)
        if not dataproxy_file:
            raise DataproxyFileNotFound(f'Could not find DataproxyFile {file_path} in bucket {bucket_name}')
        return dataproxy_file.get_download_link()

    def upload_file_to(self, source_file, bucket, destination, filename):
        # type: (str, str, str, str) -> bool
        """
        Uploads the file <source_file> to bucket <bucket> in directory <destination> with name <filename>
        ----------
        :source_file: path to the file to upload
        :bucket: name of the bucket in which to upload
        :destination: path to the directory in the bucket to upload in
        :filename: name of the file after upload
        -------
        :return: True if file uploaded successfully, False otherwise
        """
        if not os.path.exists(source_file):
            raise FileNotFoundError(f'Could not find source file {source_file} on disk!')
        to = destination.strip(' ').strip('/')
        to = f'{to}/{filename}'
        bucket = self._get_bucket(bucket)
        try:
            bucket.upload(source_file, to)
        except RuntimeError:
            return False
        return True

    def get_bucket_upload_url(self, to_bucket, with_name, to_path):
        # type: (str, str, str) -> str
        """
        Get an upload url in the bucket <to_bucket> with a path <to_path> and the name <with_name>.
        Any file uploaded to this url should be a bytes stream and the method should be 'PUT'.
        """
        target = f'{to_path}/{with_name}'.lstrip('/')
        bucket = self._get_bucket(to_bucket)
        resp = bucket.client.put(f"/v1/{bucket.target}/{bucket.dataproxy_entity_name}/{target}")
        upload_url = resp.json().get("url")
        if upload_url is None:
            raise RuntimeError(f"Bucket.upload did not get upload url.")
        return upload_url

    def delete_file_from_bucket(self, bucket_name, file_path):
        dataproxy_file = self._get_dataproxy_file(file_path, bucket_name)
        resp = {'success': False, 'message': ''}
        try:
            LOGGER.warning(f'Deleting file {file_path}')
            dataproxy_file.delete()
            resp = {'success': True, 'message': f'File {file_path} was deleted from bucket {bucket_name}'}
        except (Unauthorized, AssertionError) as e:
            LOGGER.error(f'Something went wrong trying to delete file. Error: {e}')
            resp['message'] = str(e)
        return resp

    def rename_file(self, bucket_name: str, file_path: str, new_name: str):
        dataproxy_file = self._get_dataproxy_file(file_path, bucket_name)
        dir_path = '/'.join(file_path.split('/')[:-1])
        file_data = dataproxy_file.get_content()
        upload_url = self.get_bucket_upload_url(bucket_name, new_name, dir_path)
        resp = requests.request('PUT', upload_url, data=file_data)
        resp.raise_for_status()
        dataproxy_file.delete()
        return {'name': new_name, 'path': dir_path + '/' + new_name}

    def list_buckets(self):
        buckets = self.client.buckets.list_buckets()
        return [b.name for b in buckets]

    def guess_bucket(self):
        # type: () -> str
        """
        Attempt to guess a bucket name by looking for repos named as the mounted drive
        """
        LOGGER.info('Trying to guess bucket...')
        token = self.client.token
        collab_name = pathlib.Path.cwd().parts[4]  # educated guess, safer than lab env vars
        LOGGER.info(f'educated guess: {collab_name}')
        LOGGER.info('getting drive client...')
        drive_client = ebrains_drive.connect(token=token)
        LOGGER.info(f'try to get repo by name {collab_name}...')
        repos = drive_client.repos.get_repos_by_name(collab_name)
        assert (len(repos) == 1)
        LOGGER.info(f'found {len(repos)} repos')
        LOGGER.info(f'attempting to find collab of repo {repos[0].id}')
        response = requests.get(
            "https://wiki.ebrains.eu/rest/v1/collabs",
            params={
                "driveId": repos[0].id,
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        if not response.ok:
            LOGGER.error(f'Could not complete request: {response.reason}')
            raise ConnectionError(f'Failed request: {response.reason}')

        bucket_name = response.json()['name']  # same as collab url name
        LOGGER.info(f'Estimated bucket to be {bucket_name}')
        return bucket_name
