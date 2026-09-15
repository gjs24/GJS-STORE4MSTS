export type BoardCategory = 'Coach Board' | 'Station Board' | 'SLR Board' | 'Loco Board' | 'LED Texture Sheet' | 'Custom';

export type FieldType = 'text' | 'image';

export interface FixedGraphicElement {
  id: string;
  type: 'logo' | 'text' | 'divider' | 'bolt' | 'badge';
  content?: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width?: number; // percentage
  height?: number; // percentage
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  iconName?: string; // 'ir-emblem' | 'train' | 'flag' | 'warning'
  rotation?: number; // 0 - 360 degrees
  scale?: number; // zoom / scale factor e.g. 1.0
  opacity?: number; // 0.0 - 1.0 (useful for watermark / stamp)
}

export interface EditableField {
  id: string;
  label: string;
  type?: FieldType; // 'text' (default) or 'image'
  defaultValue: string; // text string or image URL
  placeholder?: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
  
  // Free rotation and zoom/scale
  rotation?: number; // 0 - 360 degrees rotation
  scale?: number; // zoom / scale multiplier (e.g. 1.0)
  
  // Admin permissions: Can users edit this field?
  allowUserEdit?: boolean; // default true. If false, strictly locked for users!

  // User visibility: Can regular users see this field in the edit form?
  hiddenFromUser?: boolean; // default false (visible). If true, hidden from user form!

  // Text specific properties
  fontFamily: string;
  fontSize: number; // base font size in px
  fontWeight: number;
  fontStyle?: 'normal' | 'italic';
  color: string;
  align: 'left' | 'center' | 'right';
  textTransform?: 'uppercase' | 'none' | 'capitalize';
  letterSpacing?: number;
  outlineColor?: string;
  outlineWidth?: number;
  maxChars?: number;
  helpText?: string;
  
  // Authentic LED styling options
  ledGlow?: boolean;
  glowColor?: string;
  glowRadius?: number;
  isDotMatrix?: boolean;

  // Image / Picture Box properties
  imageUrl?: string;
  imageFit?: 'contain' | 'cover' | 'fill';
}

export interface BoardTemplate {
  id: string;
  name: string;
  category: BoardCategory;
  description: string;
  aspectRatio: string; // e.g. '1:1', '16:4', '16:5'
  baseWidth: number; // default virtual width (e.g. 1024)
  baseHeight: number; // default virtual height (e.g. 1024)
  backgroundColor: string;
  backgroundSecondaryColor?: string;
  backgroundType: 'solid' | 'gradient' | 'two-tone' | 'transparent';
  backgroundImageUrl?: string; // Custom uploaded texture sheet or image
  backgroundFit?: 'cover' | 'contain' | 'stretch';
  isTextureSheet?: boolean; // 1024x1024 UV texture sheet for simulators
  textureResolution?: number; // 1024 or 2048
  targetTextureName?: string; // Exact texture filename required by MSTS/Open Rails 3D model, e.g. 'VB_NAME' or 'VB_NAME.dds'
  
  // Site branding / watermark at template end
  showWatermark?: boolean; // default true
  watermarkText?: string; // e.g. 'Created with GJS Railway Board Studio • https://gjs-store-4-msts.vercel.app'
  
  // Admin permission: Can users customize the background?
  allowUserCustomBackground?: boolean; // default false (locked)

  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  innerBorder?: boolean;
  innerBorderColor?: string;
  innerBorderPadding?: number;
  showBolts?: boolean;
  fixedGraphics: FixedGraphicElement[];
  fields: EditableField[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
  author: string;

  // Store Pricing & Access Gating
  isPaid?: boolean; // false = Free; true = Paid purchase required
  price?: number; // e.g. 49, 99, 149 (in INR ₹)
  currency?: string; // default 'INR' (₹)
  isUnlocked?: boolean; // true if free, unlocked, or purchased
  canCustomize?: boolean; // true if permitted to save customized variants
  unlockedViaAsset?: { id: number; title: string; slug: string } | null;
  bundledWithAssets?: { id: number; title: string; slug: string; price: string }[];
}

export type UserBoardValues = Record<string, string>;

export interface SavedUserBoard {
  id: string;
  templateId: string;
  title: string;
  values: UserBoardValues;
  customBackground?: string;
  savedAt: string;
}

export interface GoogleUserProfile {
  id: string;
  userId: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  purchasedTemplateIds: string[];
  createdAt: string;
}

export type UserProfile = GoogleUserProfile;

export type CashfreeEnvironment = 'sandbox' | 'production';

export interface CashfreeConfig {
  appId: string;
  secretKey?: string;
  environment: CashfreeEnvironment;
  isEnabled: boolean;
  apiVersion: string;
}

export interface CashfreeOrderCustomer {
  customerId: string;
  customerEmail: string;
  customerPhone?: string;
  customerName: string;
}

export interface CashfreeOrder {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  customerDetails: CashfreeOrderCustomer;
  orderMeta?: {
    returnUrl?: string;
    notifyUrl?: string;
  };
  templateId: string;
  templateName: string;
  createdAt: string;
}

export type CashfreePaymentMethodType = 'upi' | 'card' | 'netbanking' | 'wallet' | 'simulation';

export interface CashfreePaymentReceipt {
  orderId: string;
  paymentId: string;
  referenceId: string;
  txStatus: 'SUCCESS' | 'FAILED' | 'USER_DROPPED';
  txTime: string;
  paymentMode: string;
  amount: number;
  currency: string;
  customerUserId: string;
  customerName: string;
  templateId: string;
  templateName: string;
}

