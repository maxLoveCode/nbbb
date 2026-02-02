<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '80px' : '260px'" class="sidebar">
      <div class="logo">
        <div class="logo-icon">NB</div>
        <transition name="fade">
          <span v-if="!isCollapse" class="logo-text">NOT-BORING</span>
        </transition>
      </div>
      
      <el-menu
        :default-active="$route.path"
        :collapse="isCollapse"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>Dashboard</template>
        </el-menu-item>
        
        <el-menu-item index="/products">
          <el-icon><Goods /></el-icon>
          <template #title>Products</template>
        </el-menu-item>
        
        <el-menu-item index="/categories">
          <el-icon><Menu /></el-icon>
          <template #title>Categories</template>
        </el-menu-item>
        
        <el-menu-item index="/orders">
          <el-icon><List /></el-icon>
          <template #title>Orders</template>
        </el-menu-item>
        
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <template #title>Members</template>
        </el-menu-item>
        
        <el-menu-item index="/homepage">
          <el-icon><House /></el-icon>
          <template #title>Homepage</template>
        </el-menu-item>
        
        <el-menu-item index="/media">
          <el-icon><Picture /></el-icon>
          <template #title>Media</template>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-footer">
        <el-button text @click="isCollapse = !isCollapse" class="collapse-btn">
          <el-icon :size="18">
            <component :is="isCollapse ? 'Expand' : 'Fold'" />
          </el-icon>
        </el-button>
      </div>
    </el-aside>
    
    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <span class="page-title">{{ $route.meta?.title }}</span>
        </div>
        
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <div class="user-profile">
              <el-avatar :size="36">
                {{ userStore.userInfo?.username?.[0]?.toUpperCase() || 'A' }}
              </el-avatar>
              <div class="user-info">
                <span class="user-name">{{ userStore.userInfo?.username || 'Admin' }}</span>
                <span class="user-role">Administrator</span>
              </div>
              <el-icon class="arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  Sign Out
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)

function handleCommand(cmd) {
  if (cmd === 'logout') {
    ElMessageBox.confirm('Are you sure you want to sign out?', 'Confirm', {
      type: 'warning',
      confirmButtonText: 'Sign Out',
      cancelButtonText: 'Cancel'
    }).then(() => {
      userStore.logout()
      router.push('/login')
    })
  }
}
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
  background: var(--bg-dark);
}

.sidebar {
  background: var(--bg-card);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  
  .logo {
    height: 72px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 12px;
    border-bottom: 1px solid var(--border-color);
    
    .logo-icon {
      width: 40px;
      height: 40px;
      background: var(--gradient-gold);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: #0a0a0a;
      flex-shrink: 0;
    }
    
    .logo-text {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: 2px;
      white-space: nowrap;
    }
  }
  
  .el-menu {
    flex: 1;
    border: none;
    padding: 16px 12px;
    
    .el-menu-item {
      height: 48px;
      line-height: 48px;
      margin-bottom: 4px;
      border-radius: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: all 0.2s;
      
      .el-icon {
        font-size: 18px;
      }
      
      &:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
      
      &.is-active {
        background: rgba(201, 169, 98, 0.15);
        color: var(--primary);
        
        .el-icon {
          color: var(--primary);
        }
      }
    }
  }
  
  .sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--border-color);
    
    .collapse-btn {
      width: 100%;
      height: 40px;
      color: var(--text-secondary);
      
      &:hover {
        color: var(--primary);
      }
    }
  }
}

.main-container {
  background: var(--bg-dark);
}

.header {
  height: 72px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  
  .header-left {
    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.5px;
    }
  }
  
  .header-right {
    .user-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: var(--bg-hover);
      }
      
      .user-info {
        display: flex;
        flex-direction: column;
        
        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .user-role {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }
      
      .arrow {
        color: var(--text-muted);
        font-size: 12px;
      }
    }
  }
}

.main {
  background: var(--bg-dark);
  overflow-y: auto;
  padding: 0;
}

// 路由切换动画
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
