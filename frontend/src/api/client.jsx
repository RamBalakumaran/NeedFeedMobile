import axios from 'axios';


const API_URL = 'http://10.26.95.49:5000/api'; 

export default axios.create({
  baseURL: API_URL,
});