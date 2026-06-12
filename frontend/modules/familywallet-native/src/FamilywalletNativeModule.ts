import { NativeModule, requireNativeModule } from 'expo';

declare class FamilywalletNativeModule extends NativeModule<{}> {}

export default requireNativeModule<FamilywalletNativeModule>('FamilywalletNative');
