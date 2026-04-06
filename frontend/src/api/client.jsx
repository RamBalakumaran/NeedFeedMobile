import axios from 'axios';
import Constants from 'expo-constants';

const FALLBACK_API_URL = 'https://needfeed-backend.onrender.com/api';

const isUsableLanHost = (host) => (
  /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  && host !== '127.0.0.1'
  && host !== '0.0.0.0'
);

const resolveRuntimeApiUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const hostUri = typeof Constants.expoConfig?.hostUri === 'string'
    ? Constants.expoConfig.hostUri
    : '';
  const runtimeHost = hostUri.split(':')[0]?.trim();

  if (isUsableLanHost(runtimeHost)) {
    return `http://${runtimeHost}:5000/api`;
  }

  return FALLBACK_API_URL;
};

const API_URL = resolveRuntimeApiUrl();

export default axios.create({
  baseURL: API_URL,
});
