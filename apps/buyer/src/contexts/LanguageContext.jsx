import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(false);

  const languages = {
    en: { name: 'English', flag: '🇺🇸', code: 'en' },
    es: { name: 'Español', flag: '🇪🇸', code: 'es' },
    fr: { name: 'Français', flag: '🇫🇷', code: 'fr' },
    de: { name: 'Deutsch', flag: '🇩🇪', code: 'de' },
    it: { name: 'Italiano', flag: '🇮🇹', code: 'it' },
    pt: { name: 'Português', flag: '🇵🇹', code: 'pt' },
    ru: { name: 'Русский', flag: '🇷🇺', code: 'ru' },
    zh: { name: '中文', flag: '🇨🇳', code: 'zh' },
    ja: { name: '日本語', flag: '🇯🇵', code: 'ja' },
    ko: { name: '한국어', flag: '🇰🇷', code: 'ko' },
    ar: { name: 'العربية', flag: '🇸🇦', code: 'ar' },
    hi: { name: 'हिन्दी', flag: '🇮🇳', code: 'hi' }
  };

  const translations_data = {
    en: {
      // Navigation
      'nav.home': 'Home',
      'nav.products': 'Products',
      'nav.cart': 'Cart',
      'nav.messages': 'Messages',
      'nav.profile': 'Profile',
      
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.search': 'Search',
      'common.filter': 'Filter',
      'common.sort': 'Sort',
      
      // Products
      'product.add_to_cart': 'Add to Cart',
      'product.add_to_wishlist': 'Add to Wishlist',
      'product.quick_view': 'Quick View',
      'product.price': 'Price',
      'product.description': 'Description',
      'product.reviews': 'Reviews',
      'product.rating': 'Rating',
      
      // Orders
      'order.status': 'Status',
      'order.total': 'Total',
      'order.date': 'Date',
      'order.track': 'Track Order',
      'order.cancel': 'Cancel Order',
      'order.view_details': 'View Details',
      
      // Wallet
      'wallet.balance': 'Balance',
      'wallet.add_funds': 'Add Funds',
      'wallet.withdraw': 'Withdraw',
      'wallet.transactions': 'Transactions',
      
      // Messages
      'message.type_message': 'Type a message...',
      'message.send': 'Send',
      'message.voice': 'Voice Message',
      'message.emoji': 'Emoji',
      'message.attachment': 'Attachment'
    },
    es: {
      'nav.home': 'Inicio',
      'nav.products': 'Productos',
      'nav.cart': 'Carrito',
      'nav.messages': 'Mensajes',
      'nav.profile': 'Perfil',
      
      'common.loading': 'Cargando...',
      'common.error': 'Error',
      'common.success': 'Éxito',
      'common.cancel': 'Cancelar',
      'common.save': 'Guardar',
      'common.delete': 'Eliminar',
      'common.edit': 'Editar',
      'common.add': 'Agregar',
      'common.search': 'Buscar',
      'common.filter': 'Filtrar',
      'common.sort': 'Ordenar',
      
      'product.add_to_cart': 'Agregar al Carrito',
      'product.add_to_wishlist': 'Agregar a Favoritos',
      'product.quick_view': 'Vista Rápida',
      'product.price': 'Precio',
      'product.description': 'Descripción',
      'product.reviews': 'Reseñas',
      'product.rating': 'Calificación',
      
      'order.status': 'Estado',
      'order.total': 'Total',
      'order.date': 'Fecha',
      'order.track': 'Rastrear Pedido',
      'order.cancel': 'Cancelar Pedido',
      'order.view_details': 'Ver Detalles',
      
      'wallet.balance': 'Saldo',
      'wallet.add_funds': 'Agregar Fondos',
      'wallet.withdraw': 'Retirar',
      'wallet.transactions': 'Transacciones',
      
      'message.type_message': 'Escribe un mensaje...',
      'message.send': 'Enviar',
      'message.voice': 'Mensaje de Voz',
      'message.emoji': 'Emoji',
      'message.attachment': 'Adjunto'
    },
    fr: {
      'nav.home': 'Accueil',
      'nav.products': 'Produits',
      'nav.cart': 'Panier',
      'nav.messages': 'Messages',
      'nav.profile': 'Profil',
      
      'common.loading': 'Chargement...',
      'common.error': 'Erreur',
      'common.success': 'Succès',
      'common.cancel': 'Annuler',
      'common.save': 'Enregistrer',
      'common.delete': 'Supprimer',
      'common.edit': 'Modifier',
      'common.add': 'Ajouter',
      'common.search': 'Rechercher',
      'common.filter': 'Filtrer',
      'common.sort': 'Trier',
      
      'product.add_to_cart': 'Ajouter au Panier',
      'product.add_to_wishlist': 'Ajouter aux Favoris',
      'product.quick_view': 'Aperçu Rapide',
      'product.price': 'Prix',
      'product.description': 'Description',
      'product.reviews': 'Avis',
      'product.rating': 'Note',
      
      'order.status': 'Statut',
      'order.total': 'Total',
      'order.date': 'Date',
      'order.track': 'Suivre la Commande',
      'order.cancel': 'Annuler la Commande',
      'order.view_details': 'Voir les Détails',
      
      'wallet.balance': 'Solde',
      'wallet.add_funds': 'Ajouter des Fonds',
      'wallet.withdraw': 'Retirer',
      'wallet.transactions': 'Transactions',
      
      'message.type_message': 'Tapez un message...',
      'message.send': 'Envoyer',
      'message.voice': 'Message Vocal',
      'message.emoji': 'Emoji',
      'message.attachment': 'Pièce Jointe'
    }
  };

  useEffect(() => {
    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem('preferred-language') || 'en';
    setCurrentLanguage(savedLanguage);
    loadTranslations(savedLanguage);
  }, []);

  const loadTranslations = async (language) => {
    try {
      setLoading(true);
      // In a real app, this would fetch from an API
      const translations = translations_data[language] || translations_data.en;
      setTranslations(translations);
    } catch (error) {
      console.error('Error loading translations:', error);
      setTranslations(translations_data.en);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async (languageCode) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('preferred-language', languageCode);
    await loadTranslations(languageCode);
    
    // Update document direction for RTL languages
    if (['ar', 'he', 'fa'].includes(languageCode)) {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  };

  const t = (key, params = {}) => {
    let translation = translations[key] || key;
    
    // Replace parameters in translation
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, params[param]);
    });
    
    return translation;
  };

  const formatCurrency = (amount, currency = 'NGN') => {
    const currencySymbols = {
      'NGN': '₦',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'INR': '₹'
    };
    
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (date, options = {}) => {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Date(date).toLocaleDateString(currentLanguage, { ...defaultOptions, ...options });
  };

  const value = {
    currentLanguage,
    languages,
    translations,
    loading,
    changeLanguage,
    t,
    formatCurrency,
    formatDate
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
