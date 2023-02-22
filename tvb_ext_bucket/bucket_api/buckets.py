from ebrains_drive.exceptions import ClientHttpError, Unauthorized
from ebrains_drive.utils import on_401_raise_unauthorized
from tvb_ext_bucket.exceptions import BucketDTOError
from tvb_ext_bucket.bucket_api.bucket import Bucket, Endpoint
from tvb_ext_bucket.logger.builder import get_logger
from time import sleep
from dataclasses import dataclass
from typing import List

LOGGER = get_logger(__name__)

# mapping between how a param is called in json response from api and how it is called as an
# argument in the  __init_ of bucket. This is needed since there is the possibility of some keys in the
# json response to be named as some reserved python names (e.g. bytes)
# format is <json_response_key>: <actual_bucket_param_name>
BUCKET_PARAMS_MAP = {
    'name': 'name',
    'objects_count': 'objects_count',
    'bytes': 'bytes_count',
    'last_modified': 'last_modified',
    'is_public': 'is_public',
    'role': 'role',
    'is_initialized': 'is_initialized'
}


@dataclass
class BucketDTO:
    name: str
    role: str
    is_public: bool


class Buckets:
    BUCKETS_ENDPOINT = '/v1/buckets'
    DATASETS_ENDPOINT = '/v1/datasets'

    def __init__(self, client):
        self._available_buckets: List[BucketDTO] = []
        self.client = client

    @on_401_raise_unauthorized(
        '401 response. Check you/your token have access right and/or the bucket name has been spelt correctly.')
    def get_bucket(self, bucket_name: str, *, public: bool = False) -> Bucket:
        """
        Get the specified bucket according name.
        """
        LOGGER.info(f'Trying to retrieve bucket {bucket_name}. (Public: {public})')
        resp = self.client.get(f"{self.BUCKETS_ENDPOINT}/{bucket_name}/stat")
        params = self._sanitize_bucket_params(resp.json())
        return Bucket.from_json(self.client, params, public=public, target=Endpoint.BUCKETS)

    def get_dataset(self, dataset_id: str, *, public: bool = False, request_access: bool = False):
        request_sent = False
        attempt_no = 0
        while True:
            try:
                resp = self.client.get(f"{self.DATASETS_ENDPOINT}/{dataset_id}/stat")
                return Bucket.from_json(self.client, resp.json(), public=public, target=Endpoint.DATASETS,
                                        dataset_id=dataset_id)
            except ClientHttpError as e:
                if e.code != 401:
                    raise e

                if not request_access:
                    raise Unauthorized(
                        "You do not have access to this dataset. "
                        "If this is a private dataset, try to set request_access flag to true. "
                        "We can start the procedure of requesting access for you.")
                if not request_sent:
                    self.client.post(f"/v1/datasets/{dataset_id}", expected=(200, 201))
                    request_sent = True
                    print("Request sent. Please check the mail box associated with the token.")
                sleep(5)
                attempt_no = attempt_no + 1
                print(f"Checking permission, attempt {attempt_no}")

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

    def _check_bucket_availability(self, bucket_name):
        # type: (str) -> bool
        """
        Checks if the bucket is available for current user.
        """
        for bucket in self.list_buckets():
            if bucket.name == bucket_name:
                return True
        return False

    def _sanitize_bucket_params(self, params_dict):
        # type: (dict) -> dict
        sanitized = dict()
        for k, v in BUCKET_PARAMS_MAP.items():
            try:
                sanitized[v] = params_dict[k]
            except KeyError:
                pass
        return sanitized
