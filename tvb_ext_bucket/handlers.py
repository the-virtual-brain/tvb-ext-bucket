# -*- coding: utf-8 -*-
#
# "TheVirtualBrain - Widgets" package
#
# (c) 2022-2023, TVB Widgets Team
#

import json

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
from tornado.web import MissingArgumentError

from ebrains_drive.exceptions import TokenExpired
from tvb_ext_bucket.exceptions import CollabAccessError
from tvb_ext_bucket.ebrains_drive_wrapper import BucketWrapper
from tvb_ext_bucket.logger.builder import get_logger

LOGGER = get_logger(__name__)


class BucketsHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        response = {
            'message': '',
            'files': []
        }
        try:
            bucket_name = self.get_argument('bucket')
            LOGGER.info(f'OPEN bucket {json.dumps(bucket_name)}')
            bucket_wrapper = BucketWrapper()
            response['files'] = bucket_wrapper.get_files_in_bucket(bucket_name)
        except MissingArgumentError:
            response['message'] = 'No collab name provided!'
        except TokenExpired as e:
            LOGGER.info(f'Collab token expired: {e}')
            response['message'] = 'Error on getting buckets, your collab token is expired!'
        except CollabAccessError as e:
            response['message'] = e.message
        self.finish(json.dumps(response))


class DownloadHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        response = {
            'success': False,
            'message': ''
          }
        try:
            file_path = self.get_argument('file')
            bucket = self.get_argument('bucket')
            download_destination = self.get_argument('download_destination')
            bucket_wrapper = BucketWrapper()
            resp = bucket_wrapper.download_file(file_path, bucket, download_destination)
            response['success'] = resp
            response['message'] = f'File {file_path} was downloaded from bucket {bucket}'
            self.finish(response)
        except MissingArgumentError as e:
            response['message'] = e.log_message
            self.finish(response)
        except FileExistsError:
            response['message'] = f'File {file_path.split("/")[-1]} already exists! Please move or ' \
                                  f'rename the existing file and try again!'
            self.finish(response)


class UploadHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        response = {
            'success': False,
            'message': ''
        }
        try:
            source_file = self.get_argument('source_file')
            bucket = self.get_argument('bucket')
            destination = self.get_argument('destination')
            filename = self.get_argument('filename')
            bucket_wrapper = BucketWrapper()
            resp = bucket_wrapper.upload_file_to(source_file, bucket, destination, filename)
            if not resp:
                response['message'] = f'Could not upload file {source_file} to bucket {bucket} at {destination}'
            else:
                response = {
                    'success': True,
                    'message': 'Upload success!'
                }
            self.finish(response)
        except MissingArgumentError as e:
            response['message'] = e.log_message
            self.finish(response)


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    bucket_pattern = url_path_join(base_url, "tvb_ext_bucket", "buckets")
    download_pattern = url_path_join(base_url, "tvb_ext_bucket", "download")
    upload_pattern = url_path_join(base_url, "tvb_ext_bucket", "upload")

    handlers = [
        (bucket_pattern, BucketsHandler),
        (download_pattern, DownloadHandler),
        (upload_pattern, UploadHandler)
    ]
    web_app.add_handlers(host_pattern, handlers)
