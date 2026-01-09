import axios from "axios";

const API_URL = "http://blogingapp-production.up.railway.app/user"; // rename api → API_URL

export const getUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/user`);
    return response.data; // assuming backend returns array of users
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};
