<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="grid-pattern"></div>
    </div>
    
    <div class="login-content">
      <!-- 左侧品牌区 -->
      <div class="brand-section">
        <div class="brand-logo">NB</div>
        <h1 class="brand-title">NOT-BORING<br/>BOREBOI</h1>
        <p class="brand-subtitle">Admin Dashboard</p>
        <div class="brand-features">
          <div class="feature">
            <el-icon><Goods /></el-icon>
            <span>Product Management</span>
          </div>
          <div class="feature">
            <el-icon><DataAnalysis /></el-icon>
            <span>Sales Analytics</span>
          </div>
          <div class="feature">
            <el-icon><User /></el-icon>
            <span>Customer Insights</span>
          </div>
        </div>
      </div>
      
      <!-- 右侧登录表单 -->
      <div class="login-card">
        <div class="login-header">
          <h2>Welcome Back</h2>
          <p>Sign in to continue to dashboard</p>
        </div>
        
        <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="Username"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="Password"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-btn"
              @click="handleLogin"
            >
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </el-button>
          </el-form-item>
        </el-form>
        
        <div class="login-footer">
          <span>Demo: admin / admin123</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Goods, DataAnalysis } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: 'Please enter username', trigger: 'blur' }],
  password: [{ required: true, message: 'Please enter password', trigger: 'blur' }]
}

async function handleLogin() {
  await formRef.value?.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      if (form.username === 'admin' && form.password === 'admin123') {
        userStore.login('mock-token-' + Date.now(), { id: 1, username: 'admin', role: 'admin' })
        ElMessage.success('Welcome back!')
        router.push('/dashboard')
      } else {
        ElMessage.error('Invalid credentials')
      }
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  position: relative;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  
  .circle {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
  }
  
  .circle-1 {
    width: 600px;
    height: 600px;
    background: rgba(201, 169, 98, 0.15);
    top: -200px;
    right: -200px;
  }
  
  .circle-2 {
    width: 400px;
    height: 400px;
    background: rgba(201, 169, 98, 0.1);
    bottom: -100px;
    left: -100px;
  }
  
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 50px 50px;
  }
}

.login-content {
  display: flex;
  gap: 80px;
  align-items: center;
  position: relative;
  z-index: 1;
  max-width: 1000px;
  width: 100%;
  padding: 40px;
}

.brand-section {
  flex: 1;
  
  .brand-logo {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #c9a962 0%, #e5d4a1 50%, #c9a962 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 800;
    color: #0a0a0a;
    margin-bottom: 32px;
    box-shadow: 0 20px 60px rgba(201, 169, 98, 0.3);
  }
  
  .brand-title {
    font-size: 48px;
    font-weight: 800;
    color: #fff;
    line-height: 1.1;
    letter-spacing: -2px;
    margin: 0 0 16px;
    
    background: linear-gradient(135deg, #fff 0%, #c9a962 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .brand-subtitle {
    font-size: 18px;
    color: #666;
    margin: 0 0 48px;
    letter-spacing: 4px;
    text-transform: uppercase;
  }
  
  .brand-features {
    display: flex;
    flex-direction: column;
    gap: 16px;
    
    .feature {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #888;
      font-size: 14px;
      
      .el-icon {
        font-size: 18px;
        color: #c9a962;
      }
    }
  }
}

.login-card {
  width: 400px;
  padding: 48px;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 24px;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
  
  .login-header {
    margin-bottom: 40px;
    
    h2 {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 8px;
    }
    
    p {
      font-size: 14px;
      color: #666;
      margin: 0;
    }
  }
  
  .el-form-item {
    margin-bottom: 24px;
  }
  
  .el-input {
    :deep(.el-input__wrapper) {
      height: 52px;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 0 16px;
      
      &:hover {
        border-color: #333;
      }
      
      &.is-focus {
        border-color: #c9a962;
        box-shadow: 0 0 0 4px rgba(201, 169, 98, 0.1);
      }
      
      .el-input__inner {
        color: #fff;
        font-size: 15px;
        
        &::placeholder {
          color: #555;
        }
      }
      
      .el-input__prefix {
        color: #555;
      }
    }
  }
  
  .login-btn {
    width: 100%;
    height: 52px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
    background: linear-gradient(135deg, #c9a962 0%, #e5d4a1 50%, #c9a962 100%);
    background-size: 200% auto;
    border: none;
    color: #0a0a0a;
    transition: all 0.3s;
    
    &:hover {
      background-position: right center;
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(201, 169, 98, 0.4);
    }
  }
  
  .login-footer {
    text-align: center;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #2a2a2a;
    
    span {
      font-size: 13px;
      color: #555;
    }
  }
}

@media (max-width: 900px) {
  .login-content {
    flex-direction: column;
    gap: 40px;
  }
  
  .brand-section {
    text-align: center;
    
    .brand-logo {
      margin: 0 auto 24px;
    }
    
    .brand-title {
      font-size: 32px;
    }
    
    .brand-features {
      display: none;
    }
  }
  
  .login-card {
    width: 100%;
    max-width: 400px;
  }
}
</style>
