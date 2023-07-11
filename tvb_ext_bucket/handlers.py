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
        try:
            wrapper = BucketWrapper()
            resp = wrapper.list_buckets()
            self.finish(json.dumps(resp))
        except Exception as e:
            LOGGER.error(f'Could not get a list of available buckets : {str(e)}')
            self.finish(json.dumps([]))


class BucketHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        response = {
            'success': False,
            'message': '',
            'files': []
        }
        try:
            bucket_name = self.get_argument('bucket')
            LOGGER.info(f'OPEN bucket {json.dumps(bucket_name)}')
            bucket_wrapper = BucketWrapper()
            response['files'] = bucket_wrapper.get_files_in_bucket(bucket_name)
            response['success'] = True
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
        except MissingArgumentError as e:
            response['message'] = e.log_message
        except FileExistsError:
            response['message'] = f'File {file_path.split("/")[-1]} already exists! Please move or ' \
                                  f'rename the existing file and try again!'
        self.finish(json.dumps(response))


class DownloadUrlHandler(APIHandler):
    """
    Handler for download urls
    """
    @tornado.web.authenticated
    def get(self):
        response = {
            'success': False,
            'message': '',
            'url': ''
        }
        try:
            file_path = self.get_argument('file')
            bucket = self.get_argument('bucket')
            bucket_wrapper = BucketWrapper()
            url = bucket_wrapper.get_download_url(file_path, bucket)
            response['success'] = True
            response['url'] = url
        except (MissingArgumentError, FileNotFoundError) as e:
            response['message'] = e.log_message
        self.finish(json.dumps(response))


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


class LocalUploadHandler(APIHandler):
    """
    Handler for uploading a file from local storage
    """
    @tornado.web.authenticated
    def get(self):
        """
        get route of the handler. Returns an url to send data to with a "PUT" request
        """
        response = {
            'success': False,
            'url': ''
        }
        try:
            to_bucket = self.get_argument('to_bucket')
            with_name = self.get_argument('with_name')
            to_path = self.get_argument('to_path')
            wrapper = BucketWrapper()
            url = wrapper.get_bucket_upload_url(to_bucket, with_name, to_path)
            response['success'] = True
            response['url'] = url
        except MissingArgumentError as e:
            response['message'] = e.log_message
        except RuntimeError as e:
            response['message'] = str(e)
        self.finish(response)


class ObjectsHandler(APIHandler):
    """
    Handler for objects in bucket
    """
    @tornado.web.authenticated
    def delete(self, bucket_name, file_path):
        bucket = str(bucket_name)
        file_str = str(file_path)
        LOGGER.warning(f'DELETE: file {file_str} in bucket {bucket}!')
        wrapper = BucketWrapper()
        delete_response = wrapper.delete_file_from_bucket(bucket, file_str)
        self.finish(json.dumps(delete_response))


class RenameHandler(APIHandler):
    def get(self):
        response = {
            'success': False,
            'message': '',
            'newData': {}
        }
        try:
            bucket = self.get_argument('bucket')
            file_path = self.get_argument('path')
            new_name = self.get_argument('new_name')
            wrapper = BucketWrapper()
            new_data = wrapper.rename_file(bucket, file_path, new_name)
            response['success'] = True
            response['newData'] = new_data
        except MissingArgumentError as e:
            response['message'] = str(e)
        if not response['success']:
            self.set_status(400)
            self.finish(json.dumps(response))
        else:
            self.finish(json.dumps(response))


class GuessBucketHandler(APIHandler):
    def get(self):
        response = {
            'success': False,
            'bucket': '',
            'message': ''
        }
        try:
            wrapper = BucketWrapper()
            response['bucket'] = wrapper.guess_bucket()
            response['success'] = True
        except AssertionError:
            response['message'] = 'Could not identify a repo. ' \
                                  'This installation of tvb-ext-bucket might not be in an ebrains environment!'
        except Exception as e:
            response['message'] = str(e)
        self.finish(json.dumps(response))


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    buckets_list_pattern = url_path_join(base_url, "tvb_ext_bucket", "buckets_list")
    bucket_pattern = url_path_join(base_url, "tvb_ext_bucket", "buckets")
    download_pattern = url_path_join(base_url, "tvb_ext_bucket", "download")
    download_ulr_pattern = url_path_join(base_url, "tvb_ext_bucket", "download_url")
    upload_pattern = url_path_join(base_url, "tvb_ext_bucket", "upload")
    local_upload_pattern = url_path_join(base_url, "tvb_ext_bucket", "local_upload")
    objects_handler = url_path_join(base_url, "tvb_ext_bucket", r"objects/(.*)/(.*)")
    rename_handler_pattern = url_path_join(base_url, "tvb_ext_bucket", "rename")
    guess_bucket_pattern = url_path_join(base_url, "tvb_ext_bucket", "guess_bucket")

    handlers = [
        (buckets_list_pattern, BucketsHandler),
        (bucket_pattern, BucketHandler),
        (download_pattern, DownloadHandler),
        (download_ulr_pattern, DownloadUrlHandler),
        (upload_pattern, UploadHandler),
        (local_upload_pattern, LocalUploadHandler),
        (objects_handler, ObjectsHandler),
        (rename_handler_pattern, RenameHandler),
        (guess_bucket_pattern, GuessBucketHandler)
    ]
    web_app.add_handlers(host_pattern, handlers)
