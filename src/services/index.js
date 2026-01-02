import * as WalletService from './wallet.service';
import * as TransactionService from './transaction.service';
import * as AuthService from './auth.service';
import * as ProfileService from './profile.service';
import * as CategoryService from './category.service';
import * as NotificationService from './notification.service';
import * as FundService from './fund.service';
import * as ExchangeRateService from './exchange-rate.service';
import * as WeatherService from './weather.service';
import * as AdminUserApi from './adminUserApi';
import * as LoginLogApi from './loginLogApi';
import * as ApiHelper from './api-helper';
import apiClient, { budgetAPI as apiClientBudgetAPI } from './api-client';

// Export common named APIs for convenience (keep compatibility with imports like `import { walletAPI } from '../services'`)
export const walletAPI = WalletService.walletAPI;
export const transactionAPI = TransactionService.transactionAPI;
export const authAPI = AuthService;
export const profileAPI = ProfileService;
export const budgetAPI = apiClientBudgetAPI;

// Export namespaces if caller prefers grouped access
export const WalletServiceNS = WalletService;
export const TransactionServiceNS = TransactionService;
export const AuthServiceNS = AuthService;
export const ProfileServiceNS = ProfileService;
export const CategoryServiceNS = CategoryService;
export const NotificationServiceNS = NotificationService;
export const FundServiceNS = FundService;
export const ExchangeRateServiceNS = ExchangeRateService;
export const WeatherServiceNS = WeatherService;
export const AdminUserApiNS = AdminUserApi;
export const LoginLogApiNS = LoginLogApi;
export const ApiHelperNS = ApiHelper;
export const ApiClientNS = apiClient;

// Also re-export specific helpers if needed
export const { categoryAPI } = CategoryService;
export const { notificationAPI } = NotificationService;
