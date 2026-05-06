const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const premiumSlogans = [
    {
        title: 'Morning Essentials! 🥛',
        body: 'Fresh milk, bread, and eggs delivered before you wake up. Order now!',
        image_url: 'https://images.unsplash.com/photo-1550583724-12558142ab46?q=80&w=1000&auto=format&fit=crop'
    },
    {
        title: 'Dinner Plans? 🥗',
        body: 'Fresh veggies and premium oils for a healthy dinner. 15-min delivery!',
        image_url: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?q=80&w=1000&auto=format&fit=crop'
    },
    {
        title: 'Snack Attack! 🍟',
        body: 'Hungry for a crunch? Get your favorite chips and dip now!',
        image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=1000&auto=format&fit=crop'
    },
    {
        title: 'Berry Sweet Deals! 🍓',
        body: 'Seasonal berries are here! Grab them while stocks last at 30% OFF.',
        image_url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=1000&auto=format&fit=crop'
    },
    {
        title: 'Household Superstars! ✨',
        body: 'Detergents, soaps, and cleaners. Stock up your pantry today!',
        image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop'
    }
];

async function seedSlogans() {
    console.log('Inserting premium slogans...');
    const { data, error } = await supabase
        .from('marketing_slogans')
        .insert(premiumSlogans)
        .select();

    if (error) {
        console.error('Error seeding slogans:', error.message);
    } else {
        console.log(`Successfully added ${data.length} premium slogans!`);
    }
}

seedSlogans();
