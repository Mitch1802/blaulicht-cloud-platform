import packageJson from '../../package.json';

export const environment = {
  production: true,
  version: packageJson.version,
  apiUrl: 'https://' + window.location.host + '/api/v1/',
  title: "Blaulichtcloud"
};
