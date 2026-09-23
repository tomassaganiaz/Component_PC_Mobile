import { MaterialIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

type MIconName = keyof typeof MaterialIcons.glyphMap;

const MAP: Record<string, MIconName> = {
  shield_locked: 'shield',
  shield_with_heart: 'shield',
  verified_user: 'verified-user',
  lock_open: 'lock-open',
  badge: 'badge',
  terminal: 'code',
  fingerprint: 'fingerprint',
  check: 'check',
  account_balance: 'account-balance',
  token: 'vpn-key',
  grid_view: 'grid-view',
  manage_search: 'search',
  add: 'add',
  notifications: 'notifications',
  search: 'search',
  verified: 'verified',
  memory: 'memory',
  developer_board: 'developer-board',
  smartphone: 'smartphone',
  storage: 'storage',
  laptop_chromebook: 'laptop',
  hardware: 'hardware',
  check_circle: 'check-circle',
  thermostat: 'thermostat',
  battery_charging_full: 'battery-charging-full',
  battery_horiz_075: 'battery-charging-full',
  task_alt: 'task-alt',
  screen_search_desktop: 'monitor',
  screenshot_monitor: 'monitor',
  device_thermostat: 'thermostat',
  speed: 'speed',
  qr_code_scanner: 'qr-code-scanner',
  local_shipping: 'local-shipping',
  inventory_2: 'inventory-2',
  photo_camera: 'photo-camera',
  lock: 'lock',
  security: 'security',
  replay: 'replay',
  account_balance_wallet: 'account-balance-wallet',
  star: 'star',
  science: 'science',
  biotech: 'biotech',
  sync: 'sync',
  chat: 'chat',
  download: 'download',
  equalizer: 'equalizer',
  handshake: 'handshake',
  contact_support: 'contact-support',
  open_in_new: 'open-in-new',
  arrow_back: 'arrow-back',
  arrow_forward: 'arrow-forward',
  person: 'person',
  verified_shield: 'verified',
  history: 'history',
  notifications_active: 'notifications-active',
  report: 'report',
  hourglass_empty: 'hourglass-empty',
};

interface Props {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export default function AppIcon({ name, size = 20, color, style }: Props) {
  const icon = MAP[name] ?? 'circle';
  return <MaterialIcons name={icon} size={size} color={color} style={style} />;
}