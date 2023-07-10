from ebrains_drive.exceptions import TokenExpired

from tvb_ext_bucket.bucket_api.buckets import Buckets
from ebrains_drive.client import ClientBase
from ebrains_drive.utils import on_401_raise_unauthorized

import base64
import json
import time


class BucketApiClient(ClientBase):

    def __init__(self, username=None, password=None, token=None, env="") -> None:
        if env != "":
            raise NotImplementedError("non prod environment for dataproxy access has not yet been implemented.")
        self._set_env(env)

        super().__init__(username, password, token, env)

        self.server = "https://data-proxy.ebrains.eu/api"

        self.buckets = Buckets(self)

    @property
    def token(self):
        return self._token

    @on_401_raise_unauthorized(
        "Failed. Note: BucketApiClient.create_new needs to have clb.drive:write as a part of scope.")
    def create_new(self, bucket_name: str, title=None, description="Created by ebrains_drive"):
        # attempt to create new collab
        self.send_request("POST", "https://wiki.ebrains.eu/rest/v1/collabs", json={
            "name": bucket_name,
            "title": title or bucket_name,
            "description": description,
            "drive": True,
            "chat": True,
            "public": False
        }, expected=201)

        # activate the bucket for the said collab
        self.send_request("POST", "/v1/buckets", json={
            "bucket_name": bucket_name
        }, expected=201)

    @on_401_raise_unauthorized(
        "Failed. Note: BucketApiClient.create_new needs to have clb.drive:write as a part of scope.")
    def delete_bucket(self, bucket_name: str):
        self.send_request("DELETE", f"/v1/buckets/{bucket_name}")

    def send_request(self, method: str, url: str, *args, **kwargs):
        _, info, _ = self._token.split('.')
        info_json = base64.b64decode(info + '==').decode('utf-8')

        # https://www.rfc-editor.org/rfc/rfc7519#section-2
        exp_utc_seconds = json.loads(info_json).get('exp')
        now_tc_seconds = time.time()

        if now_tc_seconds > exp_utc_seconds:
            raise TokenExpired

        return super().send_request(method, url, *args, **kwargs)
