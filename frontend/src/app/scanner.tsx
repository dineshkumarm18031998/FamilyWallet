import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { addExpense } from '../utils/database';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const router = useRouter();
  const db = useSQLiteContext();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        setCapturedImage(photo.uri);
        processReceipt(photo.base64);
      } catch (err) {
        Alert.alert('Camera Error', 'Failed to capture image');
      }
    }
  };

  const processReceipt = async (base64Image: string) => {
    setScanning(true);
    try {
      // Free public OCR API for extracting text
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
      formData.append('apikey', 'helloworld'); 
      formData.append('language', 'eng');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.IsErroredOnProcessing) {
        throw new Error("OCR Processing failed");
      }

      const text = result.ParsedResults?.[0]?.ParsedText || "";
      
      // Simple mock parser logic for the receipt text
      let amountMatch = text.match(/(?:total|amount|sum)[\s:]*₹?\s*([\d,]+(?:\.\d{2})?)/i) || text.match(/₹\s*([\d,]+(?:\.\d{2})?)/);
      let merchantMatch = text.split('\n')[0]?.trim() || "Unknown Merchant";
      
      let finalAmount = 0;
      if (amountMatch && amountMatch[1]) {
        finalAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }

      if (finalAmount > 0) {
        await addExpense(db, finalAmount, merchantMatch, 'Groceries', 'Shared', '', 'Scanner');
        Alert.alert('Receipt Scanned!', `Captured ₹${finalAmount} at ${merchantMatch}`);
        router.back();
      } else {
        Alert.alert('Scan Failed', 'Could not clearly read the Total Amount from the receipt. Please try again.');
        setCapturedImage(null);
      }
    } catch (e) {
      Alert.alert('Scan Failed', 'Could not connect to OCR service. Please try again.');
      setCapturedImage(null);
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.preview} />
          {scanning && (
            <View style={styles.scanningOverlay}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.scanningText}>Extracting text using AI...</Text>
            </View>
          )}
        </View>
      ) : (
        <CameraView style={styles.camera} facing="back" ref={cameraRef}>
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.guides}>
              <View style={styles.guideCornerTopLeft} />
              <View style={styles.guideCornerTopRight} />
              <View style={styles.guideCornerBottomLeft} />
              <View style={styles.guideCornerBottomRight} />
            </View>

            <View style={styles.controls}>
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  permissionText: { color: '#fff', fontSize: 16, marginBottom: 20 },
  btn: { backgroundColor: '#10b981', padding: 16, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  camera: { flex: 1 },
  previewContainer: { flex: 1 },
  preview: { flex: 1, resizeMode: 'cover' },
  scanningOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  scanningText: { color: '#10b981', marginTop: 16, fontSize: 18, fontWeight: 'bold' },
  overlay: { flex: 1, justifyContent: 'space-between', padding: 20 },
  backBtn: { marginTop: 40, alignSelf: 'flex-start' },
  guides: { flex: 1, margin: 40, position: 'relative' },
  guideCornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderColor: '#10b981', borderTopWidth: 4, borderLeftWidth: 4 },
  guideCornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderColor: '#10b981', borderTopWidth: 4, borderRightWidth: 4 },
  guideCornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderColor: '#10b981', borderBottomWidth: 4, borderLeftWidth: 4 },
  guideCornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderColor: '#10b981', borderBottomWidth: 4, borderRightWidth: 4 },
  controls: { paddingBottom: 40, alignItems: 'center' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' }
});
