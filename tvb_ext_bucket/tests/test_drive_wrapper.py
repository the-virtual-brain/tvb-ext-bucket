# -*- coding: utf-8 -*-
#
# "TheVirtualBrain - Widgets" package
#
# (c) 2022-2023, TVB Widgets Team
#
import os
import uuid
import tempfile
import shutil

import pytest

from tvb_ext_bucket.bucket_api.bucket import Endpoint
from tvb_ext_bucket.ebrains_drive_wrapper import BucketWrapper
from tvb_ext_bucket.exceptions import CollabAccessError, DataproxyFileNotFound
from ebrains_drive.exceptions import Unauthorized


class MockFile:
    def __init__(self, name):
        # type: (str) -> None
        self.name = name

    def get_content(self):
        return b'test content'

    def get_download_link(self):
        return f'{self.name}'


class MockBucket:
    def __init__(self, files_count=2, name='test_bucket', target=Endpoint.BUCKETS, dataproxy_entity_name='test_bucket'):
        self.name = name
        self.files = [MockFile(f'file{number}') for number in range(files_count)]
        self.target = target
        self.dataproxy_entity_name = dataproxy_entity_name

    def ls(self, prefix=''):
        return [f for f in self.files if f.name.startswith(prefix)]

    def upload(self, _file_obj, name):
        if name == '/err':
            raise RuntimeError('no upload')
        self.files.append(MockFile(name))


class MockBuckets:
    def __init__(self):
        self.buckets = {
            'test_bucket': MockBucket()
        }

    def get_bucket(self, name):
        try:
            return self.buckets[name]
        except KeyError:
            raise Unauthorized('Unauthorized in tests')


class MockBucketApiClient:
    def __init__(self, token=''):
        self.token = token
        self.buckets = MockBuckets()


@pytest.fixture
def mock_client(mocker):
    def mock_get_client(_):
        return MockBucketApiClient()

    mocker.patch('tvb_ext_bucket.ebrains_drive_wrapper.BucketWrapper.get_client', mock_get_client)


@pytest.fixture(scope="session")
def temp_txt_file(tmp_path_factory):
    base = tmp_path_factory.mktemp("uploads")
    test_text_file = "test.txt"
    base = base / test_text_file
    with open(base, 'x') as f:
        f.write('test text')
    return base


@pytest.fixture(scope="session")
def temp_directory(tmp_path_factory):
    base = tmp_path_factory.mktemp("temp_downloads")
    return base


def test_get_files_in_bucket(mock_client):
    """
    tests that client returns list of files from bucket
    """
    client = BucketWrapper()
    assert client.get_files_in_bucket('test_bucket') == ['file0', 'file1']


def test_raises_error_if_source_file_does_not_exist(mock_client):
    try:
        temp_dir = tempfile.mkdtemp()
        non_existent_file = 'test.test'
        source = os.path.join(temp_dir, non_existent_file)
        dest_path = '/'
        bucket = 'test_bucket'
        file_name = 'test'
        client = BucketWrapper()
        with pytest.raises(FileNotFoundError):
            client.upload_file_to(source, bucket, dest_path, file_name)
    finally:
        os.rmdir(temp_dir)


def test_raises_error_if_bucket_does_not_exist(temp_txt_file, mock_client):
    client = BucketWrapper()
    source_path = temp_txt_file.absolute()
    dest_path = '/'
    bucket = f'nonexistent-bucket-{str(uuid.uuid1())}'
    file_name = 'test'
    with pytest.raises(CollabAccessError):
        client.upload_file_to(source_path, bucket, dest_path, file_name)


def test_upload_file_to_bucket_success(temp_txt_file, mock_client):
    # make temporary file to upload
    client = BucketWrapper()
    source_path = temp_txt_file
    dest_path = '/'
    bucket = 'test_bucket'
    file_name = 'test.txt'
    resp = client.upload_file_to(source_path, bucket, dest_path, file_name)
    assert resp


def test_upload_fails_from_server(temp_txt_file, mock_client):
    client = BucketWrapper()
    source_path = temp_txt_file
    dest_path = '/'
    bucket = 'test_bucket'
    file_name = 'err'  # triggers the error from the mock obj
    resp = client.upload_file_to(source_path, bucket, dest_path, file_name)
    assert resp is False


def test_download_file_fail_as_file_is_not_in_bucket(temp_directory, mock_client):
    temp_location = temp_directory
    client = BucketWrapper()
    file_path = 'test.txt'
    bucket_name = 'test_bucket'
    resp = client.download_file(file_path, bucket_name, temp_location.name)
    assert resp is False


def test_download_file_success(temp_directory, mock_client):
    temp_location = tempfile.mkdtemp()
    client = BucketWrapper()
    file_path = 'file1'
    bucket_name = 'test_bucket'
    resp = client.download_file(file_path, bucket_name, temp_location)
    shutil.rmtree(temp_location)
    assert resp is True


def test_get_download_url_fail(mock_client):
    client = BucketWrapper()
    nonexistent_file = 'nonexistent.asd'
    url = None
    with pytest.raises(DataproxyFileNotFound):
        url = client.get_download_url(nonexistent_file, 'test_bucket')
    assert url is None


def test_get_download_url_success(mock_client):
    client = BucketWrapper()
    existent_file = 'file1'
    url = client.get_download_url(existent_file, 'test_bucket')
    assert url == existent_file
