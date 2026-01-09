from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64
from bson.errors import InvalidId

app = FastAPI(title="Blog API")


# ==========================
# MongoDB & JWT
# ==========================
MONGO_URI = "mongodb+srv://hamzashakeel219:hamza123@cluster0.hcr7m.mongodb.net/Bloging?retryWrites=true&w=majority"
SECRET_KEY = "supersecretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

client = MongoClient(MONGO_URI)
db = client["Bloging"]

# ==========================
# ✅ CORS FIX (IMPORTANT)
# ==========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://bloging-app-ruby.vercel.app",
    ],
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
    return pwd_context.hash(password.encode()[:72])

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain.encode()[:72], hashed)

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
        "contact": user.get("contact"),
        "profileImage": user.get("profileImage"),
        "createdAt": user.get("createdAt"),
    }

# ==========================
# JWT Auth
# ==========================
security = HTTPBearer()

def create_access_token(data: dict):
    data["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        user = user_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**{**user_helper(user), "password": user["password"]})
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==========================
# Auth APIs
# ==========================
@app.post("/signup")
async def signup(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    contact: str = Form(""),
    profileImage: UploadFile = File(None),
):
    if user_collection.find_one({"email": email.lower()}):
        raise HTTPException(status_code=400, detail="Email already exists")

    user = {
        "name": name,
        "email": email.lower(),
        "password": hash_password(password),
        "role": role,
        "contact": contact,
        "profileImage": None,
        "createdAt": datetime.utcnow(),
    }

    if profileImage:
        user["profileImage"] = base64.b64encode(
            await profileImage.read()
        ).decode()

    user_collection.insert_one(user)
    return {"message": "User registered"}

@app.post("/login")
def login(email: str = Body(...), password: str = Body(...)):
    user = user_collection.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token({"user_id": str(user["_id"]), "role": user["role"]})
    return {
        "access_token": token,
        "role": user["role"],
        "userId": str(user["_id"]),
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
# Posts
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
        "updatedAt": post["updatedAt"],
    }

@app.post("/post/create")
async def create_post(
    title: str = Form(...),
    content: str = Form(...),
    tags: str = Form(""),
    postImage: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin allowed")

    post = {
        "title": title,
        "content": content,
        "authorId": current_user.id,
        "tags": tags.split(",") if tags else [],
        "postImage": None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    if postImage:
        post["postImage"] = base64.b64encode(
            await postImage.read()
        ).decode()

    post_collection.insert_one(post)
    return {"message": "Post created"}

@app.get("/post")
def get_posts():
    return [post_helper(p) for p in post_collection.find()]

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