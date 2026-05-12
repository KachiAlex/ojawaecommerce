import HomeOjawa from './HomeOjawa';

// Thin wrapper so any route still pointing at HomeNew
// will render the new Ojawa homepage layout.
const HomeNew = () => {
  return <HomeOjawa />;
};

export default HomeNew;
