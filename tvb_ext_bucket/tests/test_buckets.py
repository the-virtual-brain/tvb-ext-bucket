from tvb_ext_bucket.bucket_api.buckets import Buckets
from requests import Response


class MockClient:
    def get(self, _url):
        resp = Response()
        resp._content = b'''{
                              "name": "tvb-widgets",
                              "objects_count": 3,
                              "bytes": 271489,
                              "last_modified": "Mon, 20 Feb 2023 14:47:57 GMT",
                              "is_public": false,
                              "role": "viewer",
                              "is_initialized": true
                            }'''
        return resp



def test_buckets_instance():
    fake_client = MockClient()
    buckets = Buckets(fake_client)
    assert buckets.client == fake_client
    assert buckets._available_buckets == []


def test_get_bucket():
    fake_client = MockClient()
    buckets = Buckets(fake_client)
    bucket = buckets.get_bucket('tvb-widgets')
    assert bucket.name == 'tvb-widgets'
