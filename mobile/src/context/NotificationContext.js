import { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

const Ctx = createContext({ refreshKey: 0 });

export function NotificationProvider({ children, navigationRef }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const notifRef    = useRef();
  const responseRef = useRef();

  useEffect(() => {
    notifRef.current = Notifications.addNotificationReceivedListener(() => {
      setRefreshKey(k => k + 1);
    });

    responseRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      setRefreshKey(k => k + 1);
      navigateToVisit(response, navigationRef);
    });

    return () => {
      notifRef.current?.remove();
      responseRef.current?.remove();
    };
  }, []);

  return (
    <Ctx.Provider value={{ refreshKey }}>
      {children}
    </Ctx.Provider>
  );
}

function navigateToVisit(response, navigationRef) {
  const visitId = response?.notification?.request?.content?.data?.visitId;
  if (visitId && navigationRef?.current?.isReady()) {
    navigationRef.current.navigate('VisitDetail', { visit: { id: visitId } });
  }
}

export { navigateToVisit };

export function useNotification() {
  return useContext(Ctx);
}
