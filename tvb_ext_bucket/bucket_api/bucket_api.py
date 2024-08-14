from ebrains_drive.client import BucketApiClient

from tvb_ext_bucket.bucket_api.buckets import ExtendedBuckets


class ExtendedBucketApiClient(BucketApiClient):

    def __init__(self, username=None, password=None, token=None, env="") -> None:
        super().__init__(username, password, token, env)
        self.buckets = ExtendedBuckets(self)

    @property
    def token(self):
        return self._token
