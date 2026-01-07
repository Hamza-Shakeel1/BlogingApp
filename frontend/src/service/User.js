import axios from "axios";

const API_URL = "http://127.0.0.1:8000"; // rename api → API_URL

export const getUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/user`);
    return response.data; // assuming backend returns array of users
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};
