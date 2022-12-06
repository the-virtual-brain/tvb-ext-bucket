# -*- coding: utf-8 -*-
#
# "TheVirtualBrain - Widgets" package
#
# (c) 2022-2023, TVB Widgets Team
#

import json
import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from tornado.web import MissingArgumentError
from ebrains_drive.exceptions import TokenExpired
from tvbextbucket.exceptions import CollabAccessError
from tvbextbucket.ebrains_drive_wrapper import BucketWrapper
from tvbextbucket.logger.builder import get_logger

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
    bucket_pattern = url_path_join(base_url, "tvbextbucket", "buckets")
    handlers = [(bucket_pattern, BucketsHandler)]
    web_app.add_handlers(host_pattern, handlers)
