import { FaHeart, FaRegHeart } from "react-icons/fa";

/**
 * সাধারণ গেম কার্ড কম্পোনেন্ট
 */
export default function GameCard({ game, isWishlisted, onWishlist, onClick, isDisabled }) {
  // যদি গেমের স্ট্যাটাস unavailable হয় অথবা ইভেন্ট শেষ হয়ে যায় (isDisabled)
  const isUnavailable = game.status === 'unavailable' || isDisabled;

  return (
    <div 
      className={`game-card ${isUnavailable ? 'disabled' : ''}`} 
      onClick={!isUnavailable ? onClick : undefined}
    >
      {/* Wishlist Icon */}
      <div 
        className={`wishlist-icon ${isWishlisted ? 'active' : ''}`} 
        onClick={(e) => {
          e.stopPropagation(); // কার্ডে ক্লিক না পড়ে শুধু হার্টে ক্লিক পড়বে
          onWishlist(e);
        }}
      >
        {isWishlisted ? <FaHeart /> : <FaRegHeart />}
      </div>

      {/* Unavailable Overlay */}
      {isUnavailable && (
        <div className="unavailable-overlay">
          {/* নিশ্চিত করুন public ফোল্ডারে unavailable.png আছে */}
          <img src="/unavailable.png" alt="Unavailable" /> 
        </div>
      )}

      {/* Badge (যদি থাকে) */}
      {game.badgeText && <span className="card-badge">{game.badgeText}</span>}
      
      {/* Image */}
      <div className="icon-wrapper">
        <img src={game.logo} alt={game.name} />
      </div>

      {/* Title */}
      <div className="game-info-container">
        <div className="game-name">{game.name}</div>
        {/* ক্যাটাগরি যদি দেখাতে চান (অপশনাল) */}
        {game.category && <div className="game-category">{game.category}</div>}
      </div>
    </div>
  );
}

/**
 * গিফট কার্ড স্টাইল কম্পোনেন্ট (আলাদা ডিজাইনের জন্য)
 */
export function GiftCard({ game, isWishlisted, onWishlist, onClick, isDisabled }) {
  const isUnavailable = game.status === 'unavailable' || isDisabled;

  return (
    <div 
      className={`game-card gift-card-container ${isUnavailable ? 'disabled' : ''}`} 
      onClick={!isUnavailable ? onClick : undefined}
    >
      <div 
        className={`wishlist-icon ${isWishlisted ? 'active' : ''}`} 
        onClick={(e) => {
          e.stopPropagation();
          onWishlist(e);
        }}
      >
        {isWishlisted ? <FaHeart /> : <FaRegHeart />}
      </div>

      {isUnavailable && (
        <div className="unavailable-overlay">
          <img src="/unavailable.png" alt="Unavailable" />
        </div>
      )}

      {game.badgeText && <span className="card-badge">{game.badgeText}</span>}

      <div className="gift-card-content">
        <div className="gc-top">
          <div className="gc-hanger"></div>
          <h1 className="gc-title">{game.name}</h1>
          <p className="gc-subtitle">Redeem for apps, games & more</p>
        </div>
        <div className="gc-bottom">
          <img className="gc-play-logo-img" src={game.logo} alt={game.name} />
          <span className="gc-brand-name">{game.name}</span>
        </div>
      </div>
    </div>
  );
}
