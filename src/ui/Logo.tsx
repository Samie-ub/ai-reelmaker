import { navigate } from '../navigation';

export function Logo() {
  return (
    <button className="brand" onClick={() => navigate('/')} aria-label="ReelMaker home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>ReelMaker</span>
    </button>
  );
}
