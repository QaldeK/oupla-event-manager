// Hook pour nettoyer les verrous orphelins
pb.hooks.onRecordBeforeUpdate((e) => {
    const record = e.record;
    
    // Si le pad est marqué comme en édition
    if (record.isEditing) {
        const now = new Date();
        const lastUpdated = new Date(record.updated);
        const lockDuration = now - lastUpdated;
        
        // Si le verrou est trop ancien (> 15 minutes)
        if (lockDuration > 15 * 60 * 1000) {
            record.isEditing = false;
            record.editingUser = null;
            console.log(`Nettoyage automatique du verrou pour le pad ${record.id}`);
        }
    }
    
    return e.record;
});

// Tâche cron pour nettoyer périodiquement
pb.crons.add("cleanup_stale_locks", "0 */5 * * * *", async () => {
    const staleTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const records = await pb.collection("pads").getFullList({
        filter: `isEditing = true && updated < "${staleTime}"`
    });
    
    for (const record of records) {
        await pb.collection("pads").update(record.id, {
            isEditing: false,
            editingUser: null
        });
        console.log(`Nettoyage cron du verrou pour pad ${record.id}`);
    }
});
