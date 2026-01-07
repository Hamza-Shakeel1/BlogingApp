from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64
from bson.errors import InvalidId

app = FastAPI(title="Blog API")

# ==========================
# MongoDB Connection
# ==========================
MONGO_URI = "mongodb+srv://hamzashakeel219:hamza123@cluster0.hcr7m.mongodb.net/Bloging?retryWrites=true&w=majority"
SECRET_KEY = "supersecretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60    

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("✅ MongoDB connected successfully!")
except Exception as e:
    print("❌ MongoDB connection failed:", e)
    client = None

db = client["Bloging"] if client else None

# ==========================
# CORS Middleware
# ==========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is working"}

# ==========================
# Password Hashing
# ==========================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")[:72]
    return pwd_context.hash(password_bytes)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")[:72]
    return pwd_context.verify(password_bytes, hashed_password)

# ==========================
# User Model
# ==========================
class User(BaseModel):
    id: Optional[str]
    name: str
    email: EmailStr
    password: str
    role: str
    contact: Optional[str] = None
    profileImage: Optional[str] = None
    createdAt: Optional[datetime] = None

user_collection = db["user"]

def user_helper(user):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "contact": user.get("contact", ""),
        "profileImage": user.get("profileImage"),
        "createdAt": user.get("createdAt")
    }

# ==========================
# JWT Auth
# ==========================
security = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = user_collection.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return User(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        password=user["password"],
        role=user["role"],
        contact=user.get("contact"),
        profileImage=user.get("profileImage"),
        createdAt=user.get("createdAt")
    )

# ==========================
# User Endpoints
# ==========================
@app.get("/user")
def get_users():
    return [user_helper(u) for u in user_collection.find()]

@app.post("/signup")
async def create_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    contact: str = Form(""),
    profileImage: UploadFile = File(None)
):
    email = email.lower().strip()
    if user_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = hash_password(password)

    user_dict = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "role": role,
        "contact": contact,
        "profileImage": None,
        "createdAt": datetime.utcnow()
    }

    if profileImage and profileImage.filename:
        contents = await profileImage.read()
        user_dict["profileImage"] = base64.b64encode(contents).decode("utf-8")

    result = user_collection.insert_one(user_dict)
    new_user = user_collection.find_one({"_id": result.inserted_id})

    return {
        "message": "User registered successfully",
        "user": user_helper(new_user)
    }

@app.post("/login")

def login(email: str = Body(...), password: str = Body(...)):
    user = user_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    token_data = {"user_id": str(user["_id"]), "role": user["role"]}
    token = create_access_token(token_data)
    print("LOGIN API HIT") 
    return {"access_token": token, "role": user["role"], "userId": str(user["_id"]), "message": f"Logged in as {user['role']}"}

@app.get("/user/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    return user_helper({
        "_id": ObjectId(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "contact": current_user.contact,
        "profileImage": current_user.profileImage,
        "createdAt": current_user.createdAt
    })
@app.put("/user/me")
async def update_my_profile(
    name: str = Form(None),
    password: str = Form(None),
    contact: str = Form(None),
    profileImage: UploadFile = File(None),
    current_user: User = Depends(get_current_user)
):
    update_data = {}

    if name:
        update_data["name"] = name

    if password:
        update_data["password"] = hash_password(password)

    if contact is not None:
        update_data["contact"] = contact

    if profileImage and profileImage.filename:
        contents = await profileImage.read()
        update_data["profileImage"] = base64.b64encode(contents).decode("utf-8")

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    user_collection.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )

    updated_user = user_collection.find_one({"_id": ObjectId(current_user.id)})
    return {
        "message": "Profile updated successfully",
        "user": user_helper(updated_user)
    }
@app.put("/user/me")
async def update_my_profile(
    name: str = Form(None),
    password: str = Form(None),
    contact: str = Form(None),
    profileImage: UploadFile = File(None),
    current_user: User = Depends(get_current_user)
):
    update_data = {}

    if name:
        update_data["name"] = name

    if password:
        update_data["password"] = hash_password(password)

    if contact is not None:
        update_data["contact"] = contact

    if profileImage and profileImage.filename:
        contents = await profileImage.read()
        update_data["profileImage"] = base64.b64encode(contents).decode("utf-8")

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    user_collection.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )

    updated_user = user_collection.find_one({"_id": ObjectId(current_user.id)})
    return {
        "message": "Profile updated successfully",
        "user": user_helper(updated_user)
    }

@app.put("/user/{user_id}")
async def update_user(
    user_id: str,
    name: str = Form(None),
    email: str = Form(None),
    role: str = Form(None),
    password: str = Form(None),
    contact: str = Form(None),
    profileImage: UploadFile = File(None)
):
    update_data = {}
    if name: update_data["name"] = name
    if email: update_data["email"] = email
    if role: update_data["role"] = role
    if password: update_data["password"] = hash_password(password)
    if contact: update_data["contact"] = contact
    if profileImage:
        contents = await profileImage.read()
        update_data["profileImage"] = base64.b64encode(contents).decode("utf-8")

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = user_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated successfully", "user": user_helper(user_collection.find_one({"_id": ObjectId(user_id)}))}

@app.delete("/user/{user_id}")
def delete_user(user_id: str):
    result = user_collection.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        return {"message": "User not found"}
    return {"message": "User deleted"}

# ==========================
# Post Endpoints
# ==========================
post_collection = db["post"]

def post_helper(post):
    return {
        "id": str(post["_id"]),
        "title": post["title"],
        "content": post["content"],
        "authorId": post["authorId"],
        "tags": post["tags"],
        "postImage": post.get("postImage"),
        "createdAt": post["createdAt"],
        "updatedAt": post["updatedAt"]
    }

# Create Post
@app.post("/post/create")
async def create_post(
    title: str = Form(...),
    content: str = Form(...),
    tags: str = Form(""),
    postImage: UploadFile = File(None),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create posts")

    post_dict = {
        "title": title,
        "content": content,
        "authorId": current_user.id,
        "tags": [t.strip() for t in tags.split(",")] if tags else [],
        "postImage": None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    if postImage and postImage.filename:
        contents = await postImage.read()
        post_dict["postImage"] = base64.b64encode(contents).decode("utf-8")

    result = post_collection.insert_one(post_dict)
    new_post = post_collection.find_one({"_id": result.inserted_id})
    return {"message": "Post created", "post": post_helper(new_post)}

# Update Post
@app.put("/post/{post_id}")
async def update_post(
    post_id: str,
    title: str = Form(None),
    content: str = Form(None),
    tags: str = Form(None),
    postImage: UploadFile = File(None),
    current_user: User = Depends(get_current_user)
):
    post = post_collection.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Only admins or the original author can update
    if current_user.role != "admin" and post["authorId"] != current_user.id:
        raise HTTPException(status_code=403, detail="You are not allowed to update this post")

    update_data = {}
    if title: update_data["title"] = title
    if content: update_data["content"] = content
    if tags: update_data["tags"] = [t.strip() for t in tags.split(",")]
    if postImage and postImage.filename:
        contents = await postImage.read()
        update_data["postImage"] = base64.b64encode(contents).decode("utf-8")
    update_data["updatedAt"] = datetime.utcnow()

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    post_collection.update_one({"_id": ObjectId(post_id)}, {"$set": update_data})
    updated_post = post_collection.find_one({"_id": ObjectId(post_id)})
    return {"message": "Post updated", "post": post_helper(updated_post)}

# Delete Post
@app.delete("/post/{post_id}")
def delete_post(post_id: str, current_user: User = Depends(get_current_user)):
    # Only admin can delete
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete posts")

    # Validate post_id
    try:
        post_obj_id = ObjectId(post_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    # Find post
    post = post_collection.find_one({"_id": post_obj_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Ensure admin is the author
    if post["authorId"] != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")

    # Delete post
    post_collection.delete_one({"_id": post_obj_id})
    return {"message": "Post deleted successfully"}
# Display Posts
@app.get("/post")
def display_posts():
    return [post_helper(p) for p in post_collection.find()]
