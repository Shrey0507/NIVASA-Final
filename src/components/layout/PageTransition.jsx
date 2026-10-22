import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function PageTransition({ children }) {
  const location = useLocation();

  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname === displayLocation.pathname) {
      return;
    }

    const timer = setTimeout(() => {
      setTransitionStage('fadeOut');
    }, 0);

    return () => clearTimeout(timer);
  }, [location, displayLocation]);

  useEffect(() => {
    if (transitionStage !== 'fadeOut') {
      return;
    }

    const timer = setTimeout(() => {
      setDisplayLocation(location);
      setTransitionStage('fadeIn');
    }, 200);

    return () => clearTimeout(timer);
  }, [transitionStage, location]);

  return (
    <div className={`page-transition ${transitionStage}`}>
      {children}
    </div>
  );
}

export default PageTransition;