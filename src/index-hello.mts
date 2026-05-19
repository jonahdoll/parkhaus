import Bun from 'bun';
import { Hono } from 'hono';

/**
 * Web-Applikation mit Hono.
 * @author [Jonah Doll](mailto:dojo1024@h-ka.de)
 */
export const app = new Hono();

app.get('/', (c) => c.json({ msg: 'Hello' }));

Bun.serve({ port: 3000, fetch: app.fetch });

console.log('Der Server http://localhost:3000 ist gestartet');
