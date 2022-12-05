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
            bucket_wraper = BucketWrapper()
            response['files'] = bucket_wraper.get_files_in_bucket(bucket_name)
        except MissingArgumentError:
            self.set_status(400)
            response['message'] = 'No collab name provided!'
        except TokenExpired as e:
            LOGGER.info(f'Collab token expired: {e}')
            response['message'] = 'Error on getting buckets, your collab token is expired!'
        except CollabAccessError as e:
            response['message'] = e.message
        self.finish(json.dumps(response))


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    bucket_pattern = url_path_join(base_url, "tvb_ext_bucket", "buckets")
    handlers = [(bucket_pattern, BucketsHandler)]
    web_app.add_handlers(host_pattern, handlers)
