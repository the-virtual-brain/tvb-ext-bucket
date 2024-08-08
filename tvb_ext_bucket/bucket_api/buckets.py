from ebrains_drive.buckets import Buckets
from tvb_ext_bucket.exceptions import BucketDTOError
from tvb_ext_bucket.logger.builder import get_logger
from dataclasses import dataclass
from typing import List

LOGGER = get_logger(__name__)


@dataclass
class BucketDTO:
    name: str
    role: str
    is_public: bool


class ExtendedBuckets(Buckets):
    BUCKETS_ENDPOINT = '/v1/buckets'
    DATASETS_ENDPOINT = '/v1/datasets'

    def __init__(self, client):
        super().__init__(client)
        self._available_buckets: List[BucketDTO] = []

    def list_buckets(self):
        # type: () -> List[BucketDTO]
        """
        Queries the buckets endpoint for the available buckets for current user
        """
        try:
            resp = self.client.get(self.BUCKETS_ENDPOINT)
            json_resp = resp.json()
            updated_available_buckets = []
            for obj in json_resp:
                updated_available_buckets.append(BucketDTO(**obj))
            self._available_buckets = updated_available_buckets
            return self._available_buckets
        except KeyError as e:
            LOGGER.error(f'Received unexpected Bucket structure! {str(e)}')
            raise BucketDTOError('Unexpected response structure from server!')
