import express from "express";

import { AuthService } from "../services/AuthService.js";

const router = express.Router();

const sr=new AuthService();

// Public routes
router.post("/register", async(req,res)=>{
    const {email, password}=req.body;
    if(email===null||password===null){
        return null
    }
    const user= await sr.register(email,password)
    res.send(user);
});
router.post("/login", async(req,res)=>{
    const {email, password}=req.body;
    if(email===null||password===null){
        return null
    }
    const loginUser= await sr.login(email,password)
    res.send(loginUser);
});


export default router;
