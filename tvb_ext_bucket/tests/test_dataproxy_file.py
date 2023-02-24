import pytest
from requests import Response
from tvb_ext_bucket.bucket_api.dataproxy_file import DataproxyFile
from tvb_ext_bucket.tests.test_drive_wrapper import MockBucket


JSON_DATA = {
      "hash": "b0d3f360601315d909660a8f7381a1dc",
      "last_modified": "2023-01-11T08:27:45.613660",
      "bytes": 44190,
      "name": "connectivity_76.zip",
      "content_type": "application/zip"
    }


class MockClient:
    def get(self, url: str, params: dict = dict()) -> Response:
        if url == '/v1/buckets/test_bucket/connectivity_76.zip':
            resp = Response()
            resp._content = b'{"url" : "test_url"}'
            return resp

    def delete(self, url: str) -> Response:
        resp = Response()
        resp._content = b'{"details":"Object deleted","status_code":200}'
        resp.status_code = 200
        if url.find('fails_delete') > -1:
            resp._content = b'{"status_code":500}'
        return resp


def assert_json(dp_file: DataproxyFile) -> None:
    assert dp_file.name == JSON_DATA['name']
    assert dp_file.bytes == JSON_DATA['bytes']
    assert dp_file.hash == JSON_DATA['hash']
    assert dp_file.last_modified == JSON_DATA['last_modified']
    assert dp_file.content_type == JSON_DATA['content_type']


def test_instantiate_dataproxy_file():
    fake_client = MockClient()
    fake_bucket = MockBucket()
    dp_hash = "b0d3f360601315d909660a8f7381a1dc"
    last_modified = "2023-01-11T08:27:45.613660"
    dp_bytes = 44190
    name = "connectivity_76.zip"
    content_type = "application/zip"
    dp_file = DataproxyFile(fake_client, fake_bucket,
                            dp_hash, last_modified, dp_bytes, name, content_type)
    assert dp_file.client == fake_client
    assert dp_file.bucket == fake_bucket
    assert dp_file.name == name
    assert dp_file.bytes == dp_bytes
    assert dp_file.hash == dp_hash
    assert dp_file.last_modified == last_modified
    assert dp_file.content_type == content_type


def test_instantiate_from_json():
    fake_client = MockClient()
    fake_bucket = MockBucket()
    dp_file = DataproxyFile.from_json(fake_client, fake_bucket, JSON_DATA)
    assert dp_file.client == fake_client
    assert dp_file.bucket == fake_bucket
    assert_json(dp_file)


def test_instantiate_from_json_when_extra_keys_in_response():
    fake_client = MockClient()
    fake_bucket = MockBucket()
    JSON_DATA['new_key'] = 'new data'
    dp_file = DataproxyFile.from_json(fake_client, fake_bucket, JSON_DATA)
    assert dp_file.client == fake_client
    assert dp_file.bucket == fake_bucket
    assert_json(dp_file)
    JSON_DATA.pop('new_key')


def test_get_download_url():
    fake_client = MockClient()
    fake_bucket = MockBucket()
    dp_file = DataproxyFile.from_json(fake_client, fake_bucket, JSON_DATA)
    assert dp_file.get_download_link() == 'test_url'


def test_get_content(mocker):
    smiley_face = b'\xF0\x9F\x98\x81'

    def mock_get(_url):
        resp = Response()
        resp._content = smiley_face
        return resp
    mocker.patch('requests.get', mock_get)
    fake_client = MockClient()
    fake_bucket = MockBucket()
    dp_file = DataproxyFile.from_json(fake_client, fake_bucket, JSON_DATA)
    assert dp_file.get_content() == smiley_face


def test_delete_file_success():
    fake_client = MockClient()
    fake_bucket = MockBucket()
    dp_file = DataproxyFile.from_json(fake_client, fake_bucket, JSON_DATA)
    resp = dp_file.delete()
    assert resp == {"details": "Object deleted", "status_code": 200}


def test_delete_file_fails():
    fake_client = MockClient()
    fake_bucket = MockBucket()
    dp_file = DataproxyFile.from_json(fake_client, fake_bucket, JSON_DATA)
    dp_file.name = 'fails_delete'
    with pytest.raises(AssertionError):
        dp_file.delete()
