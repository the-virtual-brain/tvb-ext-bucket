# -*- coding: utf-8 -*-
#
# "TheVirtualBrain - Widgets" package
#
# (c) 2022-2023, TVB Widgets Team
#

from ebrains_drive import BucketApiClient
from ebrains_drive.bucket import Bucket

from ebrains_drive.exceptions import Unauthorized

from tvb_ext_bucket.logger.builder import get_logger
from tvb_ext_bucket.exceptions import CollabTokenError, CollabAccessError
import os


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
            LOGGER.error(f'Could not access bucket {bucket_name} due to {e}')
            raise CollabAccessError(e)
        return bucket

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

    def get_client(self):
        # type: () -> BucketApiClient
        """
        Get an instance of the BucketApiClient
        Returns
        -------

        """
        try:
            token = get_collab_token()
        except Exception as e:
            LOGGER.error(f'Failed to get token: {e}')
            LOGGER.info(f'Retrying to get token from environment variable {TOKEN_ENV_VAR}...')
            token = os.environ.get(TOKEN_ENV_VAR)
            LOGGER.info('Token retrieved successfully!')
        if not token:
            raise CollabTokenError('Failed to connect to EBRAINS! Could not find token!')
        return BucketApiClient(token=token)

    def download_file(self, file_path, bucket_name, location):
        # type: (str, str, str) -> bool
        """
        download a file with absolute path as <file_path> from bucket with name <bucket_name>
        to location <location>
        Parameters
        ----------
        file_path
        bucket_name
        location

        Returns
        -------

        """
        LOGGER.info(f'DOWNLOADING: attempt to download {file_path} from bucket {bucket_name} to location {location}')
        bucket = self._get_bucket(bucket_name)
        # find first dataproxy file corresponding to provided path
        dataproxy_file = next((f for f in bucket.ls() if f.name == file_path), None)
        LOGGER.info(f'FOUND: File found: {dataproxy_file}')
        if dataproxy_file is None:
            return False
        file_name = file_path.split('/')[-1]
        target_file = os.path.join(location, file_name)
        with open(target_file, 'xb') as f:
            content = dataproxy_file.get_content()
            f.write(content)
        return True
