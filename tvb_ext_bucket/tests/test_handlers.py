import json


async def test_get_example(jp_fetch):
    # When
    response = await jp_fetch("tvb_ext_bucket", "buckets")

    # Then
    assert response.code == 400
    payload = json.loads(response.body)
    assert payload == {
        "message": "No collab name provided!",
        "files": []
    }
