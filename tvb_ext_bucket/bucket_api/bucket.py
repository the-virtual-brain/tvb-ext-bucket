import enum
from typing import Iterable
import requests
from ebrains_drive.exceptions import DoesNotExist
from tvb_ext_bucket.bucket_api.dataproxy_file import DataproxyFile
from ebrains_drive.utils import on_401_raise_unauthorized
from tvb_ext_bucket.logger.builder import get_logger


LOGGER = get_logger(__name__)


class Endpoint(str, enum.Enum):
    """
    buckets or datasets endpoint
    """
    DATASETS = 'datasets'
    BUCKETS = 'buckets'


class Bucket:
    """
    A dataproxy bucket
    n.b. for a dataset bucket, role & is_public may be None
    """
    # max entries in a response
    LIMIT = 100

    def __init__(self,
                 client,
                 name: str,
                 objects_count: int,
                 bytes_count: int,
                 last_modified: str,
                 *,
                 is_initialized: bool = False,
                 is_public: bool = False,
                 role: str = None,
                 public: bool = False,
                 target: Endpoint = Endpoint.BUCKETS,
                 dataset_id: str = None) -> None:
        if public:
            raise NotImplementedError(f"Access to public datasets/buckets NYI.")
        self.is_initialised = is_initialized
        self.public = public
        self.target = target
        self.client = client
        self.name = name
        self.objects_count = objects_count
        self.bytes = bytes_count
        self.last_modified = last_modified
        self.is_public = is_public
        self.role = role

        # n.b. for dataset bucket, dataset_id needs to be used for dataproxy_entity_name,
        # but for collab bucket, name is used
        self.dataproxy_entity_name = dataset_id or name

    @classmethod
    def from_json(cls, client, bucket_json, *, public: bool = False, target: Endpoint = Endpoint.BUCKETS,
                  dataset_id=None) -> 'Bucket':
        return cls(client, **bucket_json, public=public, target=target, dataset_id=dataset_id)

    def __str__(self):
        return "(name='{}')".format(self.name)

    def __repr__(self):
        return "Bucket(name='{}')".format(self.name)

    @on_401_raise_unauthorized("Unauthorized.")
    def ls(self, prefix: str = None) -> Iterable[DataproxyFile]:
        marker = None
        visited_name = set()
        LOGGER.info(f'Listing contents in {self.dataproxy_entity_name}')
        url = f'/v1/{self.target}/{self.dataproxy_entity_name}'
        while True:
            resp = self.client.get(url, params={
                'limit': self.LIMIT,
                'marker': marker,
                'prefix': prefix
            })

            objects = resp.json().get("objects", [])
            if len(objects) == 0:
                break

            for obj in objects:
                yield DataproxyFile.from_json(self.client, self, obj)
                marker = obj.get("name")
                if marker in visited_name:
                    raise RuntimeError(f"Bucket.ls error: hash {marker} has already been visited.")
                visited_name.add(marker)

    @on_401_raise_unauthorized("Unauthorized")
    def get_file(self, name: str) -> DataproxyFile:
        name = name.lstrip("/")
        for file in self.ls(prefix=name):
            if file.name == name:
                return file
        raise DoesNotExist(f"Cannot find {name}.")

    @on_401_raise_unauthorized("Unauthorized")
    def upload(self, file_obj: str, filename: str):
        """
        open a local file <file_obj> and upload it to bucket with the name <filename>
        """
        upload_url = self.get_upload_url(filename)
        if upload_url is None:
            raise RuntimeError(f"Bucket.upload did not get upload url.")
        LOGGER.info(f'Uploading file {file_obj}')
        resp = requests.request("PUT", upload_url, data=open(file_obj, 'rb'))
        resp.raise_for_status()

    @on_401_raise_unauthorized("Unauthorized")
    def get_upload_url(self, filename):
        # type: (str) -> str | None
        """
        Get a URL to upload a file <filename> to.
        n.b. the upload is made wit a put request to the obtained URL with a stream (IO)
        """
        LOGGER.info(f'getting UPLOAD url for file {filename}')
        filename = filename.lstrip("/")
        resp = self.client.put(f"/v1/{self.target}/{self.dataproxy_entity_name}/{filename}")
        upload_url = resp.json().get("url")
        LOGGER.info(f'got url: {upload_url}')
        return upload_url
