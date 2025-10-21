from fastapi.testclient import TestClient
import src.app as appmod

client = TestClient(appmod.app)


def test_get_activities_structure():
    res = client.get('/activities')
    assert res.status_code == 200
    data = res.json()
    # expect at least one activity and structure keys
    assert isinstance(data, dict)
    assert 'Chess Club' in data
    activity = data['Chess Club']
    assert 'participants' in activity
    assert 'max_participants' in activity


def test_signup_and_delete_flow():
    activity = 'Chess Club'
    email = 'pytest-user@example.com'

    # ensure not present initially
    before = client.get('/activities').json()
    if email in before[activity]['participants']:
        client.delete(f"/activities/{activity}/participants?email={email}")

    # signup
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    body = res.json()
    assert 'Signed up' in body.get('message', '')

    # verify present
    after = client.get('/activities').json()
    assert email in after[activity]['participants']

    # duplicate signup should fail
    dup = client.post(f"/activities/{activity}/signup?email={email}")
    assert dup.status_code == 400

    # delete
    d = client.delete(f"/activities/{activity}/participants?email={email}")
    assert d.status_code == 200
    after_del = client.get('/activities').json()
    assert email not in after_del[activity]['participants']


def test_delete_nonexistent_participant():
    activity = 'Chess Club'
    email = 'nonexistent-user@example.com'

    # ensure not present
    before = client.get('/activities').json()
    if email in before[activity]['participants']:
        client.delete(f"/activities/{activity}/participants?email={email}")

    res = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res.status_code == 404
