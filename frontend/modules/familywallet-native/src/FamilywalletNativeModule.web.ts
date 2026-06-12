import { registerWebModule, NativeModule } from 'expo';

class FamilywalletNativeModule extends NativeModule<{}> {}

export default registerWebModule(FamilywalletNativeModule, 'FamilywalletNativeModule');
