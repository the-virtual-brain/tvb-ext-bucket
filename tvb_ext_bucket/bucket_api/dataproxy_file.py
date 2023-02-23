from typing import Dict, Any

import requests
from ebrains_drive.utils import on_401_raise_unauthorized
from tvb_ext_bucket.logger.builder import get_logger

LOGGER = get_logger(__name__)


class DataproxyFile:
    """
    Manages File operations
    """
    # map of keys received in json response for a file and arguments of __init__
    DP_FILE_PARAMS_MAP = {
        'hash': 'file_hash',
        'last_modified': 'last_modified',
        'bytes': 'file_bytes',
        'name': 'name',
        'content_type': 'content_type'
    }

    def __init__(self, client, bucket, file_hash: str, last_modified: str, file_bytes: int, name: str,
                 content_type: str) -> None:
        self.client = client
        self.bucket = bucket
        self.hash = file_hash
        self.last_modified = last_modified
        self.bytes = file_bytes
        self.name = name
        self.content_type = content_type

    def __str__(self):
        return 'DataproxyFile[bucket=%s, path=%s, size=%s]' % \
               (self.bucket.name, self.name, self.bytes)

    __repr__ = __str__

    def get_download_link(self):
        """n.b. this download link expires in the order of seconds if bucket is private
        """
        resp = self.client.get(f"/v1/{self.bucket.target}/{self.bucket.dataproxy_entity_name}/{self.name}", params={
            "redirect": False
        })
        return resp.json().get("url")

    def get_content(self):
        # type: () -> bytes
        """ returns the contents of a file from data storage"""
        url = self.get_download_link()
        # Auth header must **NOT** be attached to the download link obtained, or we will get 401
        return requests.get(url).content

    @classmethod
    def from_json(cls, client, bucket, file_json: Dict[str, Any]):
        parsed_args = cls._parse_json_to_params(file_json)
        return cls(client, bucket, **parsed_args)

    @on_401_raise_unauthorized("Unauthorized")
    def delete(self):
        # type: () -> dict
        # api response is expected to have status code and detail (confirmation of delete)
        # documentation states that response is different ({"failures":[string], "number_of_removals":0})
        # however it is not
        LOGGER.warning(f'DELETE: trying to delete file {self.name}')
        resp = self.client.delete(f"/v1/{self.bucket.target}/{self.bucket.dataproxy_entity_name}/{self.name}")
        json_resp = resp.json()
        LOGGER.info(f'result of operation: {json_resp}')
        assert json_resp.get('status_code') == 200
        return json_resp

    @classmethod
    def _parse_json_to_params(cls, json_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses dict to align with the __init__ params
        """
        params = dict()
        for json_key, param_key in cls.DP_FILE_PARAMS_MAP.items():
            params[param_key] = json_data[json_key]
        return params
