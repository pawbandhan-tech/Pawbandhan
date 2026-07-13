export const ANIMAL_DATABASE = [
  { id: 'dog', name: 'Dog', icon: '🐕', scientificName: 'Canis lupus familiaris', commonBreeds: ['Labrador', 'German Shepherd', 'Pariah', 'Rottweiler', 'Beagle', 'Pomeranian', 'Indian Spitz', 'Rajapalayam', 'Chippiparai', 'Kombai'] },
  { id: 'cat', name: 'Cat', icon: '🐱', scientificName: 'Felis catus', commonBreeds: ['Persian', 'Siamese', 'Maine Coon', 'Ragdoll', 'Indian Billi', 'Bombay'] },
  { id: 'cow', name: 'Cow', icon: '🐄', scientificName: 'Bos taurus', commonBreeds: ['Gir', 'Sahiwal', 'Tharparkar', 'Holstein', 'Jersey', 'Red Sindhi'] },
  { id: 'buffalo', name: 'Buffalo', icon: '🐃', scientificName: 'Bubalus bubalis', commonBreeds: ['Murrah', 'Nili-Ravi', 'Jaffarabadi', 'Mehsana'] },
  { id: 'horse', name: 'Horse', icon: '🐴', scientificName: 'Equus caballus', commonBreeds: ['Marwari', 'Manipuri', 'Zanskari', 'Mustang'] },
  { id: 'goat', name: 'Goat', icon: '🐐', scientificName: 'Capra aegagrus hircus', commonBreeds: ['Jamunapari', 'Boer', 'Sirohi', 'Barbari', 'Beetal'] },
  { id: 'sheep', name: 'Sheep', icon: '🐑', scientificName: 'Ovis aries', commonBreeds: ['Rampur Bushair', 'Chokla', 'Nellore', 'Bellary'] },
  { id: 'rabbit', name: 'Rabbit', icon: '🐰', scientificName: 'Oryctolagus cuniculus', commonBreeds: ['Holland Lop', 'Netherland Dwarf', 'Angora', 'Rex'] },
  { id: 'bird', name: 'Bird', icon: '🐦', scientificName: 'Aves', commonBreeds: ['Parrot', 'Pigeon', 'Crow', 'Sparrow', 'Peacock', 'Myna'] },
  { id: 'pig', name: 'Pig', icon: '🐷', scientificName: 'Sus domesticus', commonBreeds: ['Large White', 'Landrace', 'Duroc', 'Ghungroo'] },
  { id: 'donkey', name: 'Donkey', icon: '🫏', scientificName: 'Equus asinus', commonBreeds: ['Indian Donkey', 'Kutch'] },
  { id: 'monkey', name: 'Monkey', icon: '🐒', scientificName: 'Macaca', commonBreeds: ['Rhesus Macaque', 'Bonnet Macaque', 'Langur'] },
  { id: 'snake', name: 'Snake', icon: '🐍', scientificName: 'Serpentes', commonBreeds: ['Cobra', 'Python', 'Viper', 'Krait'] },
  { id: 'other', name: 'Other', icon: '🐾', scientificName: '', commonBreeds: [] },
];

export function getAnimalById(id) {
  return ANIMAL_DATABASE.find(a => a.id === id) || ANIMAL_DATABASE[ANIMAL_DATABASE.length - 1];
}

export function searchAnimals(query) {
  const q = (query || '').toLowerCase();
  return ANIMAL_DATABASE.filter(a =>
    a.name.toLowerCase().includes(q) ||
    a.scientificName.toLowerCase().includes(q) ||
    a.commonBreeds.some(b => b.toLowerCase().includes(q))
  );
}
