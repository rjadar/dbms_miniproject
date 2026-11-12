INSERT INTO projects(name,description) VALUES ('Atlas Commerce','A sample commerce platform used to demonstrate cascading software dependencies.') ON CONFLICT(name) DO NOTHING;
INSERT INTO components(project_id,name,kind,description)
SELECT p.id, x.name, x.kind, x.description FROM projects p
CROSS JOIN (VALUES
 ('web-portal','frontend','Customer storefront'),('api-gateway','service','Routes client requests'),
 ('identity-service','service','Authentication and access'),('catalog-service','service','Product catalogue'),
 ('order-service','service','Order lifecycle'),('payment-service','service','Payment processing'),
 ('inventory-service','service','Stock management'),('notification-worker','worker','Email and event notifications'),
 ('postgres-db','database','Transactional storage'),('redis-cache','database','Session and catalogue cache')
) AS x(name,kind,description)
WHERE p.name='Atlas Commerce' ON CONFLICT(project_id,name) DO NOTHING;
INSERT INTO dependency_edges(project_id,source_component_id,target_component_id)
SELECT p.id,s.id,t.id FROM projects p
JOIN components s ON s.project_id=p.id
JOIN components t ON t.project_id=p.id
JOIN (VALUES
 ('web-portal','api-gateway'),('api-gateway','identity-service'),('api-gateway','catalog-service'),
 ('api-gateway','order-service'),('catalog-service','postgres-db'),('catalog-service','redis-cache'),
 ('order-service','payment-service'),('order-service','inventory-service'),('order-service','postgres-db'),
 ('payment-service','notification-worker'),('inventory-service','notification-worker'),
 ('inventory-service','postgres-db')
) e(source_name,target_name) ON s.name=e.source_name AND t.name=e.target_name
WHERE p.name='Atlas Commerce' ON CONFLICT DO NOTHING;
