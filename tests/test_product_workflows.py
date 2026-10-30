"""Product regressions reuse the isolated integration-test database and fixtures."""
import unittest
import test_integration as fixtures
from database import db_client
from database.models import TrafficLogDB
from datetime import datetime, timezone, timedelta

class ProductWorkflowTests(unittest.TestCase):
    setUp = fixtures.IntegratedPlatformTests.setUp
    tearDown = fixtures.IntegratedPlatformTests.tearDown
    request_user = fixtures.IntegratedPlatformTests.request_user
    @classmethod
    def tearDownClass(cls):
        db_client.engine.dispose()

    def test_hierarchy_does_not_duplicate_alerts_for_method_variants(self):
        self.request_user('user_202')
        db_client.upsert_api_inventory('POST','/api/v1/users/{id}',False,10,['POST baseline'])
        data=self.client.get('/api/risk-hierarchy').json()
        identity=next(row for row in data['services'] if row['id']=='identity-users')
        self.assertEqual(identity['alert_count'],1)
        self.assertEqual(sum(len(endpoint['alerts']) for endpoint in identity['endpoints']),1)
        self.assertEqual(data['platform']['active_alerts_count'],1)

    def test_connections_are_validated_idempotent_and_not_falsely_monitored(self):
        payload=dict(kind='manual',name='Authorized external API',base_url='https://api.example.test',routes=[dict(method='GET',path='/api/v9/catalog')],authorized=True)
        self.assertTrue(self.client.post('/api/governance/connections/validate',json=payload).json()['valid'])
        first=self.client.post('/api/governance/connections',json=payload)
        self.assertEqual(first.status_code,200)
        self.assertEqual(first.json()['status'],'registered_only')
        self.assertEqual(self.client.post('/api/governance/connections',json=payload).json()['id'],first.json()['id'])
        self.assertEqual(self.client.get('/api/governance/kpis').json()['total_requests_observed'],0)
        item=self.client.get('/api/governance/inventory').json()[0]
        self.assertEqual(item['total_calls'],0);self.assertIsNone(item['last_seen'])
        self.assertEqual(item['auth_type'],'Not observed')
        fixtures.app.load_openapi_spec()
        self.assertIn('GET:/api/v9/catalog',fixtures.app.documented_routes)
        self.client.get('/api/v9/catalog')
        item=self.client.get('/api/governance/inventory').json()[0]
        self.assertFalse(item['is_shadow']);self.assertEqual(item['total_calls'],1);self.assertEqual(item['auth_type'],'None')
        self.assertEqual(self.client.get('/api/governance/connections').json()[0]['status'],'registered_only')
        self.assertEqual(self.client.post('/api/governance/connections',json={**payload,'authorized':False}).status_code,403)
        for url in ['file:///etc/passwd','https://user:password@example.test','http://localhost/?token=secret']:
            self.assertEqual(self.client.post('/api/governance/connections/validate',json={**payload,'base_url':url}).status_code,422)

    def test_openapi_json_import_does_not_fetch_references(self):
        payload=dict(kind='openapi',name='Imported API',base_url='https://api.example.test/v3',authorized=True,
                     specification={'openapi':'3.0.3','info':{'title':'Test','version':'1'},'paths':{'/pets/{petId}':{'get':{'responses':{'200':{'description':'OK','$ref':'http://169.254.169.254/metadata'}}}}}})
        result=self.client.post('/api/governance/connections',json=payload)
        self.assertEqual(result.status_code,200)
        self.assertEqual(result.json()['routes'],[dict(method='GET',path='/v3/pets/{id}')])
        self.assertEqual(self.client.get('/api/traffic').json(),[])
        self.assertEqual(self.client.post('/api/governance/connections/validate',json={**payload,'specification':{'openapi':'3.0.3'}}).status_code,422)

    def test_builtin_connection_status_changes_only_after_observation(self):
        created=self.client.post('/api/governance/connections',json={'kind':'demo','authorized':True}).json()
        self.assertEqual(created['status'],'registered_only')
        self.assertIsNone(created['last_observed_at'])
        self.request_user()
        observed=self.client.get('/api/governance/connections').json()[0]
        self.assertEqual(observed['status'],'local_traffic_observed')
        self.assertEqual(observed['observed_requests'],1)
        self.assertTrue(observed['last_observed_at'])

    def test_cross_site_setup_and_demo_writes_are_rejected(self):
        for path,body in [('/api/governance/connections',{'kind':'demo','authorized':True}),('/api/governance/demo/run',{'scenario':'normal','authorized':True})]:
            self.assertEqual(self.client.post(path,json=body,headers={'Origin':'https://untrusted.example'}).status_code,403)
        self.assertEqual(self.client.get('/api/governance/kpis').json()['total_requests_observed'],0)
        self.assertEqual(self.client.get('/api/governance/connections').json(),[])

    def test_controlled_scenarios_return_real_results_and_preserve_history(self):
        self.request_user()
        original=self.client.get('/api/traffic').json()[0]
        for scenario,count,detector in [('normal',1,None),('scraping',16,'scraping'),('token',3,'token_replay'),('bola',1,'bola'),('shadow',1,None)]:
            result=self.client.post('/api/governance/demo/run',json=dict(scenario=scenario,authorized=True))
            self.assertEqual(result.status_code,200,result.text)
            data=result.json();self.assertEqual(data['request_count'],count)
            self.assertEqual(data['source'],'controlled_local_demo')
            self.assertEqual(len(data['flow']['stages']),7)
            self.assertEqual(self.client.get('/api/traffic/'+str(data['selected_request']['id'])).status_code,200)
            if detector:
                self.assertIn(detector,[row['alert_type'] for row in data['findings']])
            elif scenario=='normal':
                self.assertEqual(data['findings'],[])
                self.assertEqual(data['flow']['stages'][4]['status'],'benign')
                self.assertEqual(data['flow']['stages'][6]['status'],'linked')
        self.assertEqual(self.client.get('/api/traffic/'+str(original['id'])).json(),original)
        self.assertEqual(self.client.post('/api/governance/demo/run',json=dict(scenario='normal',authorized=False)).status_code,403)
        self.assertEqual(self.client.post('/api/governance/demo/run',json=dict(scenario='normal',authorized=True,url='http://169.254.169.254')).status_code,422)
        self.assertEqual(self.client.get('/api/execution-flow?event_id=999999').status_code,404)
    def test_activity_aggregation_pagination_and_exact_filters(self):
        stamp = datetime.now(timezone.utc)
        for index in range(61):
            db_client.save_traffic_log(dict(timestamp=(stamp-timedelta(minutes=index)).isoformat(),method='GET' if index%2 else 'POST',
                endpoint='/api/users' if index%2 else '/api/payments',caller_ip='192.0.2.1',token_user_id='user_101',status_code=200 if index%2 else 403))
        summary=self.client.get('/api/governance/traffic-summary?period=all').json()
        self.assertEqual(summary['total_requests'],61)
        self.assertEqual(summary['unique_endpoints'],2)
        self.assertEqual(sum(row['count'] for row in summary['responses']),61)
        self.assertEqual(sum(row['count'] for row in summary['series']),61)
        self.assertEqual(len(summary['recent']),5)
        self.assertLessEqual(len(summary['series']),121)
        page1=self.client.get('/api/governance/requests?page=1&page_size=25').json()
        page2=self.client.get('/api/governance/requests?page=2&page_size=25').json()
        self.assertEqual(page1['total'],61)
        self.assertFalse({row['id'] for row in page1['items']} & {row['id'] for row in page2['items']})
        filtered=self.client.get('/api/governance/requests?search=payments&method=POST&status=4&order=asc').json()
        self.assertEqual(filtered['total'],31)
        self.assertEqual(filtered['items'][0]['id'],61)
        self.assertEqual(self.client.get('/api/governance/requests?page_size=1001').status_code,422)
        self.assertEqual(self.client.get('/api/governance/requests?start=invalid').status_code,422)
        self.assertEqual(self.client.get('/api/governance/traffic-summary?group=caller&period=all').json()['groups'][0]['count'],61)
        self.assertEqual(self.client.get('/api/governance/traffic-summary?search=missing').json()['recent'],[])
        self.assertEqual(self.client.get('/api/governance/kpis').json()['total_requests_observed'],61)

    def test_historical_findings_and_control_reads_remain_read_only(self):
        self.request_user('user_202')
        before=self.client.get('/api/governance/kpis').json()
        for _ in range(3):
            for path in ['/api/governance/traffic-summary','/api/governance/requests','/api/governance/connections','/api/governance/findings/1']:
                self.assertEqual(self.client.get(path).status_code,200,path)
        self.assertEqual(self.client.get('/api/governance/kpis').json(),before)
        self.assertEqual(self.client.get('/api/governance/findings/1').json()['related_event_ids'],[1])
        self.assertEqual(self.client.get('/api/governance/findings/999999').status_code,404)
