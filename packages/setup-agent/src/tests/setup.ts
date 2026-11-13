// Commands use the bundled guide unless a test serves one itself, so no test
// reaches for a real setup server.
process.env.SETUP_AGENT_GUIDE ??= "bundled";
