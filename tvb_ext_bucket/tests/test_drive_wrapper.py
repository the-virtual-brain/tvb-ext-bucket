from tvb_ext_bucket.ebrains_drive_wrapper import BucketWrapper


class MockFile:
    def __init__(self, name):
        # type: (str) -> None
        self.name = name


class MockBucket:
    def __init__(self, files_count=2, name='test_bucket'):
        self.name = name
        self.files = [MockFile(f'file{number}') for number in range(files_count)]

    def ls(self, prefix=''):
        return [f for f in self.files if f.name.startswith(prefix)]


class MockBuckets:
    def __init__(self):
        self.buckets = {
            'test_bucket': MockBucket()
        }

    def get_bucket(self, name):
        return self.buckets[name]


class MockBucketApiClient:
    def __init__(self, token=''):
        self.token = token
        self.buckets = MockBuckets()


def test_get_files_in_bucket(mocker):
    """
    tests that client returns list of files from bucket
    """
    def mock_get_client(_):
        return MockBucketApiClient()

    mocker.patch('tvb_ext_bucket.ebrains_drive_wrapper.BucketWrapper.get_client', mock_get_client)
    client = BucketWrapper()
    assert client.get_files_in_bucket('test_bucket') == ['file0', 'file1']
