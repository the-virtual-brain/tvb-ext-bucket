import json


async def test_get_example(jp_fetch):
    # When
    response = await jp_fetch("tvb-ext-bucket", "get-example")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": "This is /tvb-ext-bucket/get-example endpoint!"
    }