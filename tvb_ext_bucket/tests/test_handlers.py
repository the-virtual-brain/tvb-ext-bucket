# -*- coding: utf-8 -*-
#
# "TheVirtualBrain - Widgets" package
#
# (c) 2022-2023, TVB Widgets Team
#

import json
from tvb_ext_bucket.tests.test_drive_wrapper import mock_client


async def test_get_example(jp_fetch, mock_client):
    # When
    response = await jp_fetch("tvb_ext_bucket", "buckets")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        'success': False,
        "message": "No collab name provided!",
        "files": []
    }
