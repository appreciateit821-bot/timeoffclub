'use client';

import { useState, useEffect } from 'react';

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLrubHGaiAOkhHBGG3eNtiqQQ2G29K8Q6UjzCMRj8Aod_qJHEyV1lMk';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      initializePush();
    } else {
      setLoading(false);
    }
  }, []);

  const initializePush = async () => {
    try {
      // Service Worker 등록
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered:', registration);

      // 현재 구독 상태 확인
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      setLoading(false);

      if (subscription) {
        // 서버에 구독 정보 동기화
        await updateSubscription(subscription);
      }
    } catch (error) {
      console.error('Push initialization failed:', error);
      setLoading(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('Push subscription:', subscription);
      
      // 서버에 구독 정보 저장
      await updateSubscription(subscription);
      setIsSubscribed(true);
      
    } catch (error) {
      console.error('Push subscription failed:', error);
      alert('푸시 알림 구독에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // 서버에서 구독 정보 삭제
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (subscription: PushSubscription) => {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  };

  const testPushNotification = async () => {
    try {
      // 테스트용 셀프 푸시
      const response = await fetch('/api/admin/push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🔔 테스트 알림',
          body: '푸시 알림이 정상적으로 작동합니다!',
          targetType: 'specific',
          targetUsers: ['current_user'], // 현재 사용자만
          url: '/calendar'
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('테스트 푸시 발송 완료! 잠시 후 알림이 표시됩니다.');
      } else {
        alert('테스트 푸시 실패: ' + result.error);
      }
    } catch (error) {
      alert('테스트 푸시 오류: ' + error.message);
    }
  };

  if (!isPushSupported) {
    return (
      <div className="text-xs text-gray-500 p-2 bg-gray-800/50 rounded border">
        이 브라우저는 푸시 알림을 지원하지 않습니다
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-xs text-gray-400 p-2">
        푸시 알림 설정을 확인 중...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">푸시 알림:</span>
        <button
          onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
          disabled={loading}
          className={`text-xs px-3 py-1 rounded transition ${
            isSubscribed 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:opacity-50`}
        >
          {loading ? '처리중...' : isSubscribed ? '🔔 활성화됨' : '🔕 비활성화'}
        </button>
      </div>
      
      {isSubscribed && (
        <button
          onClick={testPushNotification}
          className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
        >
          푸시 테스트
        </button>
      )}
    </div>
  );
}