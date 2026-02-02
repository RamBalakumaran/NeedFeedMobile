import axios from 'axios';


const API_URL = 'http://192.168.0.101:5000/api'; 

export default axios.create({
  baseURL: API_URL,
});