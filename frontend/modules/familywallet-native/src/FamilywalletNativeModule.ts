import { NativeModule, requireNativeModule } from 'expo';

declare class FamilywalletNativeModule extends NativeModule<{
  hello(): string;
  setValueAsync(value: string): void;
  openNotificationSettings(): void;
}> {}

export default requireNativeModule<FamilywalletNativeModule>('FamilywalletNative');
