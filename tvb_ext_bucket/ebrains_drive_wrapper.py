# -*- coding: utf-8 -*-
#
# "TheVirtualBrain - Widgets" package
#
# (c) 2022-2023, TVB Widgets Team
#

from ebrains_drive import BucketApiClient

from ebrains_drive.exceptions import Unauthorized

from tvb_ext_bucket.logger.builder import get_logger
from tvb_ext_bucket.exceptions import CollabTokenError, CollabAccessError
import os


LOGGER = get_logger(__name__)

TOKEN_ENV_VAR = 'CLB_AUTH'


def get_collab_token():
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

    def get_files_in_bucket(self, bucket_name):
        # type: (str) -> list[str]
        """
        Gets the list of files in a bucket space
        :param bucket_name:
        :return:
        """
        LOGGER.info(f'Getting bucket {bucket_name}')
        try:
            bucket = self.client.buckets.get_bucket(bucket_name)
            LOGGER.info('Bucket retrieved successfully.')
        except Unauthorized as e:
            LOGGER.error(f'Could not access bucket {bucket_name} due to {e}')
            raise CollabAccessError(e)
        return [f.name for f in bucket.ls()]

    def get_client(self):
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
