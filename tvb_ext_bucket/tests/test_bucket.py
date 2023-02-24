import os
import tempfile

import pytest
from ebrains_drive.exceptions import DoesNotExist

from tvb_ext_bucket.bucket_api.bucket import Bucket
from requests import Response
from tempfile import TemporaryFile


BUCKET_STAT_JSON = {
  "name": "tvb-widgets",
  "objects_count": 3,
  "bytes": 271489,
  "last_modified": "Mon, 20 Feb 2023 14:47:57 GMT",
  "is_public": False,
  "role": "viewer",
  "is_initialized": True
}


class MockClient:
    """
    Mock class for client usage in bucket
    """
    def get(self, url: str, params: dict = dict()) -> Response:
        resp = Response()
        # simulate paging
        if params['marker']:
            resp._content = b'{"objects": []}'
            return resp
        resp._content = b'''{               
        "objects": [
            {
              "hash": "b0d3f360601315d909660a8f7381a1dc",
              "last_modified": "2023-01-11T08:27:45.613660",
              "bytes": 44190,
              "name": "connectivity_76.zip",
              "content_type": "application/zip"
            },
            {
              "hash": "3df0fb1df1b0169e0caea94d441472f5",
              "last_modified": "2023-01-11T08:28:55.897820",
              "bytes": 2203,
              "name": "eeg_63.txt",
              "content_type": "text/plain"
            },
            {
              "hash": "0a4f89177b7d793f5d463616be2d73d0",
              "last_modified": "2023-01-11T08:28:11.653420",
              "bytes": 225096,
              "name": "face_8614.zip",
              "content_type": "application/zip"
            }
          ],
          "container": "tvb-widgets",
          "prefix": null,
          "delimiter": null,
          "marker": null,
          "limit": 50
        }'''
        return resp

    def put(self, url, _: any = None):
        resp = Response()
        resp._content = b'{"url":"fake_upload_url"}'
        return resp


def test_bucket_instance():
    fake_client = MockClient()
    name = 'test-bucket'
    objects_count = 3
    bytes_count = 123
    last_modified = "Mon, 22 Feb 2023 14:47:57 GMT"
    bucket = Bucket(fake_client, name, objects_count, bytes_count, last_modified)
    assert bucket.name == name
    assert bucket.client == fake_client
    assert bucket.objects_count == objects_count
    assert bucket.bytes == bytes_count
    assert bucket.last_modified == last_modified
    assert bucket.public is False
    assert bucket.dataproxy_entity_name == name
    assert bucket.is_initialised is False
    assert bucket.target == 'buckets'
    assert bucket.role is None


def test_bucket_instance_from_json():
    fake_client = MockClient()
    bucket = Bucket.from_json(fake_client, BUCKET_STAT_JSON)
    assert bucket.client == fake_client
    assert bucket.target == 'buckets'
    assert bucket.name == BUCKET_STAT_JSON['name']
    assert bucket.objects_count == BUCKET_STAT_JSON['objects_count']
    assert bucket.bytes == BUCKET_STAT_JSON['bytes']
    assert bucket.last_modified == BUCKET_STAT_JSON['last_modified']
    assert bucket.public == BUCKET_STAT_JSON['is_public']
    assert bucket.dataproxy_entity_name == BUCKET_STAT_JSON['name']
    assert bucket.is_initialised == BUCKET_STAT_JSON['is_initialized']
    assert bucket.role == BUCKET_STAT_JSON['role']


def test_list_files_in_bucket():
    fake_client = MockClient()
    bucket = Bucket.from_json(fake_client, BUCKET_STAT_JSON)
    files = [f.name for f in bucket.ls()]
    expected = ["connectivity_76.zip", "eeg_63.txt", "face_8614.zip"]
    assert files == expected


def test_get_file_exists():
    fake_client = MockClient()
    bucket = Bucket.from_json(fake_client, BUCKET_STAT_JSON)
    dp_file = bucket.get_file("connectivity_76.zip")
    assert dp_file.name == "connectivity_76.zip"


def test_get_file_not_found():
    fake_client = MockClient()
    bucket = Bucket.from_json(fake_client, BUCKET_STAT_JSON)
    with pytest.raises(DoesNotExist):
        bucket.get_file('nonexistent')


def test_upload_file(mocker):
    def fake_request(method, url, data):
        if method == 'PUT':
            response = Response()
            response.status_code = 200
            return response
        return Response()
    mocker.patch('requests.request', fake_request)

    fake_client = MockClient()
    bucket = Bucket.from_json(fake_client, BUCKET_STAT_JSON)
    fd, path = tempfile.mkstemp()
    try:
        # test passes if no error occurs
        bucket.upload(path, 'test_file')
    finally:
        os.close(fd)
        os.unlink(path)

