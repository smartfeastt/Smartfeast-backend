// loadEnv.js
import path from 'path'
import dotenv from 'dotenv'

export function loadEnv() {
  // dotenv.config({
  //   path: path.resolve('./backend/.env'), // Always load the correct file
  // });
  dotenv.config();
}
